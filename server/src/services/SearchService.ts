import crypto from 'crypto';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { FoodSearchParams } from '../providers/Provider.js';
import { NormalizationService, CanonicalFoodItem } from './NormalizationService.js';
import { MatchingService } from './MatchingService.js';
import { PriceEngine, PairwiseComparisonResult } from './PriceEngine.js';
import { db } from '../db/database.js';

export interface ProviderSearchResultSummary {
  status: 'available' | 'not_configured' | 'authentication_required' | 'unavailable' | 'error';
  count: number;
  message?: string;
}

export interface MatchedComparisonItem {
  id: string;
  name: string;
  category: string;
  vegetarian: boolean | null;
  restaurant: {
    name: string;
    location: string;
    brandMatch: boolean;
  };
  providers: {
    swiggy?: CanonicalFoodItem;
    zomato?: CanonicalFoodItem;
    eatclub?: CanonicalFoodItem;
    direct?: CanonicalFoodItem;
  };
  pricingComparison: PairwiseComparisonResult;
}

export interface SearchServiceResponse {
  query: string;
  location: string;
  providers: Record<string, ProviderSearchResultSummary>;
  results: MatchedComparisonItem[];
  totalMatches: number;
  durationMs: number;
  requestId: string;
  fetchedAt: string;
}

export class SearchService {
  /**
   * Orchestrates live multi-provider search with partial failure isolation
   */
  public static async search(params: FoodSearchParams): Promise<SearchServiceResponse> {
    const requestId = crypto.randomBytes(4).toString('hex');
    const startTime = Date.now();
    const query = (params.query || '').trim();
    const locationName = (params.location?.name || params.location?.area || 'Indiranagar').trim();
    const userId = params.userId || 'default_user';

    const providerRegistry = ProviderRegistry.getInstance();
    const allProviders = providerRegistry.getAllProviders();

    const providerStatuses: Record<string, ProviderSearchResultSummary> = {};
    const rawItemsByProvider: Record<string, any[]> = {};

    // 1. Query registered external providers in parallel using Promise.allSettled
    const providerTasks = allProviders.map(async (provider) => {
      const pStart = Date.now();
      const pCode = provider.code.toLowerCase();

      try {
        const status = await provider.getStatus(userId);
        if (status.status !== 'available') {
          providerStatuses[pCode] = {
            status: status.status,
            count: 0,
            message: status.message
          };
          console.log(`[COMPARE ${requestId}] ${provider.name} status: ${status.status} (${Date.now() - pStart}ms)`);
          return;
        }

        const rawResults = await provider.searchFood({
          ...params,
          location: {
            ...params.location,
            name: locationName
          },
          userId
        });

        rawItemsByProvider[pCode] = rawResults;
        providerStatuses[pCode] = {
          status: 'available',
          count: rawResults.length
        };
        console.log(`[COMPARE ${requestId}] ${provider.name} search: ${Date.now() - pStart}ms SUCCESS (${rawResults.length} items)`);
      } catch (err: any) {
        console.warn(`[COMPARE ${requestId}] ${provider.name} search error: ${err.message}`);
        providerStatuses[pCode] = {
          status: 'unavailable',
          count: 0,
          message: err.message || 'Provider request failed'
        };
      }
    });

    await Promise.allSettled(providerTasks);

    // 2. Normalize raw external items
    const normStart = Date.now();
    const normalizedItems: CanonicalFoodItem[] = [];

    // Swiggy normalization
    if (rawItemsByProvider['swiggy']) {
      for (const item of rawItemsByProvider['swiggy']) {
        try {
          normalizedItems.push(NormalizationService.normalizeSwiggy(item.rawRestaurant, item.rawItem));
        } catch (normErr) {
          console.warn('Swiggy normalization error for item:', normErr);
        }
      }
    }

    // Zomato normalization
    if (rawItemsByProvider['zomato']) {
      for (const item of rawItemsByProvider['zomato']) {
        try {
          normalizedItems.push(NormalizationService.normalizeZomato(item.rawRestaurant, item.rawItem));
        } catch (normErr) {
          console.warn('Zomato normalization error for item:', normErr);
        }
      }
    }

    // 3. Query catalog entries to supplement known local restaurants
    if (query) {
      try {
        const catalogRows = db.prepare(`
          SELECT 
            p.id AS product_id,
            p.name AS product_name,
            p.description AS product_description,
            p.category,
            p.vegetarian,
            p.portion_size,
            p.portion_unit,
            p.image,
            b.id AS branch_id,
            b.name AS branch_name,
            b.area AS branch_area,
            b.city AS branch_city,
            r.id AS restaurant_id,
            r.name AS restaurant_name,
            pp.platform_id,
            pp.item_price,
            pp.delivery_fee,
            pp.platform_fee,
            pp.packaging_fee,
            pp.taxes,
            pp.discount,
            pp.final_price,
            pp.availability,
            pp.updated_at,
            plat.code AS platform_code
          FROM products p
          JOIN branches b ON p.restaurant_branch_id = b.id
          JOIN restaurants r ON b.restaurant_id = r.id
          JOIN product_prices pp ON pp.product_id = p.id
          JOIN platforms plat ON pp.platform_id = plat.id
          WHERE b.is_active = 1
            AND (LOWER(p.name) LIKE ? OR LOWER(r.name) LIKE ? OR LOWER(p.category) LIKE ?)
        `).all(`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`) as any[];

        for (const row of catalogRows) {
          // If external provider already returned live data, do not overwrite live data
          const isLiveExisting = normalizedItems.some(
            n => n.provider === row.platform_code && n.restaurant.name.toLowerCase() === row.restaurant_name.toLowerCase()
          );
          if (!isLiveExisting) {
            normalizedItems.push(NormalizationService.normalizeCatalogRow(row, row.platform_code));
          }
        }
      } catch (catErr) {
        console.warn('Catalog supplemental query error:', catErr);
      }
    }

    console.log(`[COMPARE ${requestId}] Normalization: ${Date.now() - normStart}ms (${normalizedItems.length} items)`);

    // 4. Matching & Grouping equivalent dishes
    const matchStart = Date.now();
    const matchedGroups: MatchedComparisonItem[] = [];

    // Group items by restaurant name + dish identity
    for (const item of normalizedItems) {
      // Find an existing match group
      let matchedGroup = matchedGroups.find(g => {
        const existingItem = g.providers.swiggy || g.providers.zomato || g.providers.eatclub || g.providers.direct;
        if (!existingItem) return false;
        const res = MatchingService.matchItems(existingItem, item);
        return res.isMatch;
      });

      if (!matchedGroup) {
        matchedGroup = {
          id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: item.item.name,
          category: item.item.category,
          vegetarian: item.item.vegetarian,
          restaurant: {
            name: item.restaurant.name,
            location: item.restaurant.location,
            brandMatch: true
          },
          providers: {},
          pricingComparison: {} as any
        };
        matchedGroups.push(matchedGroup);
      }

      // Assign to provider slot
      if (item.provider === 'swiggy' && !matchedGroup.providers.swiggy) {
        matchedGroup.providers.swiggy = item;
      } else if (item.provider === 'zomato' && !matchedGroup.providers.zomato) {
        matchedGroup.providers.zomato = item;
      } else if (item.provider === 'eatclub' && !matchedGroup.providers.eatclub) {
        matchedGroup.providers.eatclub = item;
      } else if (item.provider === 'direct' && !matchedGroup.providers.direct) {
        matchedGroup.providers.direct = item;
      }
    }

    console.log(`[COMPARE ${requestId}] Matching: ${Date.now() - matchStart}ms (${matchedGroups.length} matched dishes)`);

    // 5. Price calculation & pairwise comparison
    const priceStart = Date.now();
    for (const group of matchedGroups) {
      group.pricingComparison = PriceEngine.comparePair(group.providers.swiggy, group.providers.zomato);
    }
    console.log(`[COMPARE ${requestId}] Price calculation: ${Date.now() - priceStart}ms`);

    // 6. Filtering and Sorting
    let results = matchedGroups;

    // Filter diet
    if (params.filters?.diet === 'veg' || params.filters?.diet === 'veg_only') {
      results = results.filter(r => r.vegetarian === true);
    } else if (params.filters?.diet === 'non_veg') {
      results = results.filter(r => r.vegetarian === false);
    }

    // Filter platform
    if (params.filters?.platform && params.filters.platform !== 'all') {
      const targetPlat = params.filters.platform.toLowerCase();
      results = results.filter(r => Boolean((r.providers as any)[targetPlat]));
    }

    // Filter category
    if (params.filters?.category && params.filters.category !== 'all' && params.filters.category !== 'All') {
      const catLower = params.filters.category.toLowerCase();
      results = results.filter(r => r.category.toLowerCase().includes(catLower));
    }

    // Sort
    const sort = params.sort || 'lowest_final_price';
    results.sort((a, b) => {
      const priceA = a.pricingComparison.swiggy.finalPrice ?? a.pricingComparison.zomato.finalPrice ?? 999999;
      const priceB = b.pricingComparison.swiggy.finalPrice ?? b.pricingComparison.zomato.finalPrice ?? 999999;
      if (sort === 'highest_final_price') {
        return priceB - priceA;
      }
      return priceA - priceB;
    });

    const totalDuration = Date.now() - startTime;
    console.log(`[COMPARE ${requestId}] Total duration: ${totalDuration}ms`);

    return {
      query,
      location: locationName,
      providers: providerStatuses,
      results,
      totalMatches: results.length,
      durationMs: totalDuration,
      requestId,
      fetchedAt: new Date().toISOString()
    };
  }
}

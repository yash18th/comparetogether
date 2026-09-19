import { db } from '../db/database.js';
import { SwiggyMcpClient } from './SwiggyMcpClient.js';
import { ZomatoAdapter } from '../adapters/ZomatoAdapter.js';
import { ProductMatcher } from '../engine/ProductMatcher.js';

export interface PlatformComparisonResult {
  platform: 'Swiggy' | 'Zomato' | 'EatClub' | 'Direct';
  status: 'AVAILABLE' | 'AUTH_REQUIRED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'TIMEOUT';
  restaurantId?: string | null;
  restaurantName?: string | null;
  branch?: string | null;
  itemId?: string | null;
  itemName?: string | null;
  itemPrice: number | null;
  deliveryFee: number | null;
  packagingFee: number | null;
  platformFee: number | null;
  taxes: number | null;
  discount: number | null;
  finalPayable: number | null;
  currency: string;
  availability?: boolean;
  matchConfidence?: number;
  message?: string;
  fetchedAt: string;
  orderUrl?: string;
}

export interface ComparedItemResult {
  restaurant: {
    name: string;
    branch: string;
    area?: string;
    city?: string;
  };
  item: {
    name: string;
    description?: string;
    category?: string;
    portionSize?: number;
    portionUnit?: string;
    vegetarian?: boolean;
  };
  platforms: PlatformComparisonResult[];
}

export interface ComparisonApiResponse {
  query: string;
  location: string;
  items: ComparedItemResult[];
  results?: any[];
  data?: any[];
  fetchedAt: string;
}

export class ComparisonService {
  private static zomatoAdapter = new ZomatoAdapter();

  /**
   * Sanitized backend logger that avoids printing any sensitive keys or tokens
   */
  public static logComparison(data: {
    query: string;
    location: string;
    restaurantMatch?: string;
    swiggyStatus: string;
    zomatoStatus: string;
    durationMs: number;
    errorCategory?: string;
    fetchedAt: string;
  }) {
    console.log('[Comparison Log]', JSON.stringify({
      query: data.query,
      location: data.location,
      restaurantMatch: data.restaurantMatch || 'None',
      swiggyStatus: data.swiggyStatus,
      zomatoStatus: data.zomatoStatus,
      durationMs: data.durationMs,
      errorCategory: data.errorCategory || 'None',
      fetchedAt: data.fetchedAt
    }));
  }

  /**
   * Compare a specific dish across authorized platforms
   */
  public static async compare(params: {
    query: string;
    location?: string;
    area?: string;
    city?: string;
    restaurantName?: string;
    userId?: string;
  }): Promise<ComparisonApiResponse> {
    const startTime = Date.now();
    const query = (params.query || '').trim();
    const locArea = (params.area || params.location || 'Indiranagar').trim();
    const locCity = (params.city || 'Bangalore').trim();
    const userId = params.userId || 'default_user';
    const fetchedAt = new Date().toISOString();

    // 1. Locate candidate restaurant and products in the catalog
    let sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.category,
        p.cuisine,
        p.vegetarian,
        p.portion_size,
        p.portion_unit,
        p.image,
        b.id AS branch_id,
        b.name AS branch_name,
        b.address AS branch_address,
        b.city AS branch_city,
        b.area AS branch_area,
        b.pincode AS branch_pincode,
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        r.logo AS restaurant_logo,
        r.rating AS restaurant_rating
      FROM products p
      JOIN branches b ON p.restaurant_branch_id = b.id
      JOIN restaurants r ON b.restaurant_id = r.id
      WHERE b.is_active = 1
    `;
    const args: any[] = [];

    if (locCity) {
      sql += ` AND LOWER(b.city) = LOWER(?)`;
      args.push(locCity);
    }

    if (locArea) {
      sql += ` AND (LOWER(b.area) = LOWER(?) OR b.area LIKE ?)`;
      args.push(locArea, `%${locArea}%`);
    }

    if (params.restaurantName) {
      sql += ` AND (LOWER(r.name) = LOWER(?) OR r.name LIKE ?)`;
      args.push(params.restaurantName, `%${params.restaurantName}%`);
    }

    const rows = db.prepare(sql).all(...args) as any[];

    // Score and pick matching products
    let candidates = rows;
    if (query) {
      const qTokens = ProductMatcher.tokenize(query);
      candidates = rows.map(r => {
        const text = `${r.product_name} ${r.restaurant_name} ${r.category}`.toLowerCase();
        let score = 0;
        if (text.includes(query.toLowerCase())) score += 1.0;
        const matched = qTokens.filter(t => text.includes(t));
        if (qTokens.length > 0) score += (matched.length / qTokens.length) * 0.8;
        const dishDice = ProductMatcher.diceCoefficient(query, r.product_name);
        score += dishDice * 0.6;
        return { ...r, score };
      })
      .filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score);
    }

    // Limit to top 5 items for deep live multi-platform comparison
    const topCandidates = candidates.slice(0, 5);

    const items: ComparedItemResult[] = [];

    for (const cand of topCandidates) {
      const targetRestaurant = {
        name: cand.restaurant_name,
        branchName: cand.branch_name,
        area: cand.branch_area,
        city: cand.branch_city,
        address: cand.branch_address
      };

      const targetDish = {
        name: cand.product_name,
        category: cand.category,
        vegetarian: Boolean(cand.vegetarian),
        portionSize: cand.portion_size,
        portionUnit: cand.portion_unit
      };

      // Query platforms concurrently with Promise.allSettled
      const [swiggySettled, zomatoSettled, directSettled, eatClubSettled] = await Promise.allSettled([
        ComparisonService.getSwiggyPrice(targetRestaurant, targetDish, userId),
        ComparisonService.getZomatoPrice(targetRestaurant, targetDish),
        ComparisonService.getDirectPrice(cand.product_id),
        ComparisonService.getEatClubPrice(cand.product_id)
      ]);

      const swiggyResult: PlatformComparisonResult = swiggySettled.status === 'fulfilled'
        ? swiggySettled.value
        : {
            platform: 'Swiggy',
            status: 'UNAVAILABLE',
            itemPrice: null,
            deliveryFee: null,
            packagingFee: null,
            platformFee: null,
            taxes: null,
            discount: null,
            finalPayable: null,
            currency: 'INR',
            message: swiggySettled.reason?.message || 'Swiggy service error',
            fetchedAt: new Date().toISOString()
          };

      const zomatoResult: PlatformComparisonResult = zomatoSettled.status === 'fulfilled'
        ? zomatoSettled.value
        : {
            platform: 'Zomato',
            status: 'UNAVAILABLE',
            itemPrice: null,
            deliveryFee: null,
            packagingFee: null,
            platformFee: null,
            taxes: null,
            discount: null,
            finalPayable: null,
            currency: 'INR',
            message: zomatoSettled.reason?.message || 'Zomato service error',
            fetchedAt: new Date().toISOString()
          };

      const directResult: PlatformComparisonResult = directSettled.status === 'fulfilled'
        ? directSettled.value
        : {
            platform: 'Direct',
            status: 'UNAVAILABLE',
            itemPrice: null,
            deliveryFee: null,
            packagingFee: null,
            platformFee: null,
            taxes: null,
            discount: null,
            finalPayable: null,
            currency: 'INR',
            fetchedAt: new Date().toISOString()
          };

      const platforms = [swiggyResult, zomatoResult];
      if (directResult.status === 'AVAILABLE') {
        platforms.push(directResult);
      }
      if (eatClubSettled.status === 'fulfilled' && eatClubSettled.value.status === 'AVAILABLE') {
        platforms.push(eatClubSettled.value);
      }

      items.push({
        restaurant: {
          name: cand.restaurant_name,
          branch: cand.branch_name,
          area: cand.branch_area,
          city: cand.branch_city
        },
        item: {
          name: cand.product_name,
          description: cand.product_description,
          category: cand.category,
          portionSize: cand.portion_size,
          portionUnit: cand.portion_unit,
          vegetarian: Boolean(cand.vegetarian)
        },
        platforms
      });
    }

    const durationMs = Date.now() - startTime;
    const firstSwiggyStatus = items[0]?.platforms.find(p => p.platform === 'Swiggy')?.status || 'NOT_CHECKED';
    const firstZomatoStatus = items[0]?.platforms.find(p => p.platform === 'Zomato')?.status || 'NOT_CHECKED';

    ComparisonService.logComparison({
      query,
      location: locArea,
      restaurantMatch: items[0]?.restaurant.name,
      swiggyStatus: firstSwiggyStatus,
      zomatoStatus: firstZomatoStatus,
      durationMs,
      fetchedAt
    });

    return {
      query,
      location: locArea,
      items,
      fetchedAt
    };
  }

  /**
   * Official Swiggy MCP live search and branch matching
   */
  private static async getSwiggyPrice(
    restaurant: { name: string; branchName?: string; area?: string; city?: string; address?: string },
    dish: { name: string; category?: string; vegetarian?: boolean; portionSize?: number; portionUnit?: string },
    userId: string
  ): Promise<PlatformComparisonResult> {
    const swiggyClient = SwiggyMcpClient.getInstance();
    const status = swiggyClient.getStatus(userId);

    if (!status.connected || status.status !== 'AUTHORIZED') {
      return {
        platform: 'Swiggy',
        status: 'AUTH_REQUIRED',
        itemPrice: null,
        deliveryFee: null,
        packagingFee: null,
        platformFee: null,
        taxes: null,
        discount: null,
        finalPayable: null,
        currency: 'INR',
        message: 'Swiggy authorization is required',
        fetchedAt: new Date().toISOString()
      };
    }

    try {
      // Step 1: Ensure real Swiggy address
      let addressId = status.address?.id;
      if (!addressId) {
        const synced = await swiggyClient.syncPrimaryAddress(userId);
        addressId = synced?.id;
      }

      if (!addressId) {
        return {
          platform: 'Swiggy',
          status: 'UNAVAILABLE',
          itemPrice: null,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          message: 'Valid Swiggy address required from user profile',
          fetchedAt: new Date().toISOString()
        };
      }

      // Step 2: Search restaurants
      const restaurants = await swiggyClient.searchRestaurants(restaurant.name, addressId, userId);
      if (!restaurants || restaurants.length === 0) {
        return {
          platform: 'Swiggy',
          status: 'UNAVAILABLE',
          itemPrice: null,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          message: 'Restaurant not found in delivery radius on Swiggy',
          fetchedAt: new Date().toISOString()
        };
      }

      // Step 3: Branch-aware matching
      let matchedRest: any = null;
      let highestConfidence = 0;

      for (const candidate of restaurants) {
        const match = ProductMatcher.matchRestaurantBranch(restaurant, {
          name: candidate.name,
          branchName: candidate.branchName,
          area: candidate.area,
          city: candidate.city
        });

        if (match.isMatch && match.confidence > highestConfidence) {
          highestConfidence = match.confidence;
          matchedRest = candidate;
        }
      }

      if (!matchedRest) {
        return {
          platform: 'Swiggy',
          status: 'UNAVAILABLE',
          itemPrice: null,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          message: `No matching branch found on Swiggy for ${restaurant.name} (${restaurant.area || restaurant.branchName})`,
          fetchedAt: new Date().toISOString()
        };
      }

      // Step 4: Search dish in matched restaurant menu
      const menuItems = await swiggyClient.searchMenu(matchedRest.restaurantId, dish.name, addressId, userId);
      if (!menuItems || menuItems.length === 0) {
        return {
          platform: 'Swiggy',
          status: 'UNAVAILABLE',
          restaurantId: matchedRest.restaurantId,
          restaurantName: matchedRest.name,
          branch: matchedRest.branchName,
          itemPrice: null,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          message: 'Dish not found at this branch on Swiggy',
          fetchedAt: new Date().toISOString()
        };
      }

      // Step 5: Match candidate dishes
      let bestItem: any = null;
      let bestDishScore = 0;

      for (const item of menuItems) {
        const match = ProductMatcher.compare(
          {
            name: dish.name,
            category: dish.category,
            vegetarian: dish.vegetarian ?? true,
            portionSize: dish.portionSize
          },
          {
            name: item.name,
            vegetarian: item.isVeg,
            isAvailable: item.isAvailable
          }
        );

        if (match.confidence > bestDishScore) {
          bestDishScore = match.confidence;
          bestItem = item;
        }
      }

      if (!bestItem || bestDishScore < 0.60) {
        return {
          platform: 'Swiggy',
          status: 'UNAVAILABLE',
          restaurantId: matchedRest.restaurantId,
          restaurantName: matchedRest.name,
          branch: matchedRest.branchName,
          itemPrice: null,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          message: 'No matching dish verified on Swiggy menu',
          fetchedAt: new Date().toISOString()
        };
      }

      if (!bestItem.isAvailable) {
        return {
          platform: 'Swiggy',
          status: 'UNAVAILABLE',
          restaurantId: matchedRest.restaurantId,
          restaurantName: matchedRest.name,
          branch: matchedRest.branchName,
          itemId: bestItem.menuItemId,
          itemName: bestItem.name,
          itemPrice: bestItem.price,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          availability: false,
          message: 'Item currently out of stock on Swiggy',
          fetchedAt: new Date().toISOString()
        };
      }

      // Return real Swiggy item price
      return {
        platform: 'Swiggy',
        status: 'AVAILABLE',
        restaurantId: matchedRest.restaurantId,
        restaurantName: matchedRest.name,
        branch: matchedRest.branchName,
        itemId: bestItem.menuItemId,
        itemName: bestItem.name,
        itemPrice: bestItem.price,
        deliveryFee: null,
        packagingFee: null,
        platformFee: null,
        taxes: null,
        discount: null,
        finalPayable: bestItem.price,
        currency: 'INR',
        availability: true,
        matchConfidence: bestDishScore,
        fetchedAt: new Date().toISOString()
      };
    } catch (err: any) {
      if (err.message && (err.message.includes('timeout') || err.message.includes('timed out'))) {
        return {
          platform: 'Swiggy',
          status: 'TIMEOUT',
          itemPrice: null,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          message: 'Swiggy MCP request timed out',
          fetchedAt: new Date().toISOString()
        };
      }

      return {
        platform: 'Swiggy',
        status: 'UNAVAILABLE',
        itemPrice: null,
        deliveryFee: null,
        packagingFee: null,
        platformFee: null,
        taxes: null,
        discount: null,
        finalPayable: null,
        currency: 'INR',
        message: err.message || 'Swiggy integration error',
        fetchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Authorized Zomato query (returns NOT_CONFIGURED when credentials missing)
   */
  private static async getZomatoPrice(
    restaurant: { name: string; branchName?: string; area?: string; city?: string },
    dish: { name: string }
  ): Promise<PlatformComparisonResult> {
    if (!ComparisonService.zomatoAdapter.isAuthorized()) {
      return {
        platform: 'Zomato',
        status: 'NOT_CONFIGURED',
        itemPrice: null,
        deliveryFee: null,
        packagingFee: null,
        platformFee: null,
        taxes: null,
        discount: null,
        finalPayable: null,
        currency: 'INR',
        message: 'Authorized Zomato API access is not configured',
        fetchedAt: new Date().toISOString()
      };
    }

    // When authorized credentials exist, call Zomato API
    try {
      const liveData = await ComparisonService.zomatoAdapter.fetchLivePricing(restaurant.name, dish.name);
      if (!liveData) {
        return {
          platform: 'Zomato',
          status: 'UNAVAILABLE',
          itemPrice: null,
          deliveryFee: null,
          packagingFee: null,
          platformFee: null,
          taxes: null,
          discount: null,
          finalPayable: null,
          currency: 'INR',
          message: 'Item not found on Zomato',
          fetchedAt: new Date().toISOString()
        };
      }

      return {
        platform: 'Zomato',
        status: 'AVAILABLE',
        itemPrice: liveData.item_price || liveData.price,
        deliveryFee: liveData.delivery_fee || null,
        packagingFee: liveData.packaging_fee || null,
        platformFee: liveData.platform_fee || null,
        taxes: liveData.taxes || null,
        discount: liveData.discount || null,
        finalPayable: liveData.final_payable || liveData.total,
        currency: 'INR',
        availability: true,
        fetchedAt: new Date().toISOString()
      };
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
      return {
        platform: 'Zomato',
        status: isTimeout ? 'TIMEOUT' : 'UNAVAILABLE',
        itemPrice: null,
        deliveryFee: null,
        packagingFee: null,
        platformFee: null,
        taxes: null,
        discount: null,
        finalPayable: null,
        currency: 'INR',
        message: err.message,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Direct merchant catalog lookup
   */
  private static async getDirectPrice(productId: string): Promise<PlatformComparisonResult> {
    const row = db.prepare(`
      SELECT pp.*, plat.name as platform_name, plat.code as platform_code
      FROM product_prices pp
      JOIN platforms plat ON pp.platform_id = plat.id
      WHERE pp.product_id = ? AND plat.code = 'direct'
    `).get(productId) as any;

    if (!row) {
      return {
        platform: 'Direct',
        status: 'UNAVAILABLE',
        itemPrice: null,
        deliveryFee: null,
        packagingFee: null,
        platformFee: null,
        taxes: null,
        discount: null,
        finalPayable: null,
        currency: 'INR',
        fetchedAt: new Date().toISOString()
      };
    }

    return {
      platform: 'Direct',
      status: 'AVAILABLE',
      itemId: row.product_id,
      itemPrice: row.item_price,
      deliveryFee: row.delivery_fee,
      packagingFee: row.packaging_fee,
      platformFee: row.platform_fee,
      taxes: row.taxes,
      discount: row.discount,
      finalPayable: row.final_price,
      currency: row.currency || 'INR',
      availability: Boolean(row.availability),
      orderUrl: row.order_url,
      fetchedAt: row.updated_at || new Date().toISOString()
    };
  }

  /**
   * EatClub verified catalog lookup
   */
  private static async getEatClubPrice(productId: string): Promise<PlatformComparisonResult> {
    const row = db.prepare(`
      SELECT pp.*, plat.name as platform_name, plat.code as platform_code
      FROM product_prices pp
      JOIN platforms plat ON pp.platform_id = plat.id
      WHERE pp.product_id = ? AND plat.code = 'eatclub'
    `).get(productId) as any;

    if (!row) {
      return {
        platform: 'EatClub',
        status: 'UNAVAILABLE',
        itemPrice: null,
        deliveryFee: null,
        packagingFee: null,
        platformFee: null,
        taxes: null,
        discount: null,
        finalPayable: null,
        currency: 'INR',
        fetchedAt: new Date().toISOString()
      };
    }

    return {
      platform: 'EatClub',
      status: 'AVAILABLE',
      itemId: row.product_id,
      itemPrice: row.item_price,
      deliveryFee: row.delivery_fee,
      packagingFee: row.packaging_fee,
      platformFee: row.platform_fee,
      taxes: row.taxes,
      discount: row.discount,
      finalPayable: row.final_price,
      currency: row.currency || 'INR',
      availability: Boolean(row.availability),
      orderUrl: row.order_url,
      fetchedAt: row.updated_at || new Date().toISOString()
    };
  }
}

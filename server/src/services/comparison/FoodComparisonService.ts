import { ZomatoService, ZomatoServiceStatus } from '../zomato/index.js';
import { SwiggyService, SwiggyServiceStatus } from '../swiggy/index.js';
import { RestaurantMatcher } from '../matching/RestaurantMatcher.js';
import { FoodItemMatcher } from '../matching/FoodItemMatcher.js';
import { NormalizedFoodItem } from '../normalization/FoodItemNormalizer.js';

/**
 * Standard Food Price Comparison Result
 * Matches the user's expected comparison specification
 */
export interface ComparisonItemResult {
  item: string;
  restaurant: string;
  zomato: {
    price: number | null;
    available: boolean;
  };
  swiggy: {
    price: number | null;
    available: boolean;
  };
  difference: number | null;
  cheaperPlatform: 'zomato' | 'swiggy' | 'equal' | null;
}

export interface FoodComparisonResponse {
  item: string;
  location: string;
  status: 'available' | 'not_configured' | 'authentication_required' | 'unavailable' | 'error';
  providers: {
    zomato: {
      status: 'available' | 'not_configured' | 'error';
      message?: string;
    };
    swiggy: {
      status: 'available' | 'not_configured' | 'authentication_required' | 'error';
      message?: string;
    };
  };
  comparisons: ComparisonItemResult[];
  totalComparisons: number;
  fetchedAt: string;
}

export class FoodComparisonService {
  /**
   * Compares the same food item across Zomato and Swiggy.
   * If credentials are missing, reports "not_configured" and zero fabricated results.
   */
  public static async compareFoodItem(
    itemQuery: string,
    location: string = 'Indiranagar',
    userId: string = 'default_user'
  ): Promise<FoodComparisonResponse> {
    const zomatoService = ZomatoService.getInstance();
    const swiggyService = SwiggyService.getInstance();

    const zomatoStatus = zomatoService.getStatus();
    const swiggyStatus = swiggyService.getStatus(userId);

    const fetchedAt = new Date().toISOString();

    const isZomatoAvailable = zomatoStatus.status === 'available';
    const isSwiggyAvailable = swiggyStatus.status === 'available';

    // If both providers are not configured / unavailable, return immediate status with zero fake data
    if (!isZomatoAvailable && !isSwiggyAvailable) {
      const overallStatus = (zomatoStatus.status === 'not_configured' && swiggyStatus.status === 'not_configured')
        ? 'not_configured'
        : 'unavailable';

      return {
        item: itemQuery,
        location,
        status: overallStatus,
        providers: {
          zomato: {
            status: zomatoStatus.status,
            message: zomatoStatus.message
          },
          swiggy: {
            status: swiggyStatus.status,
            message: swiggyStatus.message
          }
        },
        comparisons: [],
        totalComparisons: 0,
        fetchedAt
      };
    }

    // Query available providers concurrently
    const [zomatoItems, swiggyItems] = await Promise.all([
      isZomatoAvailable ? zomatoService.searchFood(itemQuery, location) : Promise.resolve([]),
      isSwiggyAvailable ? swiggyService.searchFood(itemQuery, location, userId) : Promise.resolve([])
    ]);

    const comparisons: ComparisonItemResult[] = [];
    const matchedSwiggyIndices = new Set<number>();

    // Match each Zomato item with candidate Swiggy items
    for (const zItem of zomatoItems) {
      let matchedSwiggyItem: NormalizedFoodItem | null = null;
      let matchedSwiggyIdx = -1;

      for (let i = 0; i < swiggyItems.length; i++) {
        if (matchedSwiggyIndices.has(i)) continue;
        const sItem = swiggyItems[i];

        // 1. Restaurant matching with branch distinction
        const restMatch = RestaurantMatcher.matchRestaurants(
          { name: zItem.restaurantName, address: zItem.restaurantAddress },
          { name: sItem.restaurantName, address: sItem.restaurantAddress }
        );

        if (!restMatch.isMatch) continue;

        // 2. Food item matching with variant distinction
        const itemMatch = FoodItemMatcher.matchFoodItems(
          { name: zItem.itemName, description: zItem.description, variant: zItem.variant },
          { name: sItem.itemName, description: sItem.description, variant: sItem.variant }
        );

        if (itemMatch.isMatch) {
          matchedSwiggyItem = sItem;
          matchedSwiggyIdx = i;
          break;
        }
      }

      if (matchedSwiggyItem && matchedSwiggyIdx !== -1) {
        matchedSwiggyIndices.add(matchedSwiggyIdx);

        const zPrice = zItem.price;
        const sPrice = matchedSwiggyItem.price;

        let diff: number | null = null;
        let cheaper: 'zomato' | 'swiggy' | 'equal' | null = null;

        if (zPrice !== null && sPrice !== null) {
          diff = Math.abs(Number((zPrice - sPrice).toFixed(2)));
          if (zPrice < sPrice) cheaper = 'zomato';
          else if (sPrice < zPrice) cheaper = 'swiggy';
          else cheaper = 'equal';
        }

        comparisons.push({
          item: zItem.itemName,
          restaurant: zItem.restaurantName,
          zomato: {
            price: zPrice,
            available: zItem.available
          },
          swiggy: {
            price: sPrice,
            available: matchedSwiggyItem.available
          },
          difference: diff,
          cheaperPlatform: cheaper
        });
      }
    }

    return {
      item: itemQuery,
      location,
      status: comparisons.length > 0 ? 'available' : 'unavailable',
      providers: {
        zomato: {
          status: zomatoStatus.status,
          message: zomatoStatus.message
        },
        swiggy: {
          status: swiggyStatus.status,
          message: swiggyStatus.message
        }
      },
      comparisons,
      totalComparisons: comparisons.length,
      fetchedAt
    };
  }
}

/**
 * Common Normalized Food Item Contract
 * Standard data structure across all food ordering platforms (Swiggy, Zomato, etc.)
 */
export interface NormalizedFoodItem {
  platform: 'swiggy' | 'zomato' | string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  itemId: string;
  itemName: string;
  description: string;
  variant: string | null;
  price: number | null;
  currency: string;
  available: boolean;
  source: string;
  fetchedAt: string;
}

/**
 * Normalization Utility
 * Converts platform-specific API responses into the canonical NormalizedFoodItem structure
 */
export class FoodItemNormalizer {
  /**
   * Normalizes Swiggy API / MCP response into NormalizedFoodItem
   */
  public static normalizeSwiggyItem(rawRestaurant: any, rawItem: any): NormalizedFoodItem {
    const rawPrice = rawItem.price !== undefined && rawItem.price !== null ? Number(rawItem.price) : null;
    const finalPrice = rawPrice !== null && !isNaN(rawPrice) ? rawPrice : null;

    return {
      platform: 'swiggy',
      restaurantId: String(rawRestaurant?.restaurantId || rawRestaurant?.id || ''),
      restaurantName: String(rawRestaurant?.name || '').trim(),
      restaurantAddress: String(
        rawRestaurant?.address ||
        rawRestaurant?.branchName ||
        rawRestaurant?.area ||
        rawRestaurant?.city ||
        ''
      ).trim(),
      itemId: String(rawItem?.menuItemId || rawItem?.id || rawItem?.itemId || ''),
      itemName: String(rawItem?.name || rawItem?.itemName || '').trim(),
      description: String(rawItem?.description || '').trim(),
      variant: rawItem?.variant || rawItem?.portionSize || null,
      price: finalPrice,
      currency: String(rawItem?.currency || 'INR'),
      available: rawItem?.isAvailable !== false && rawItem?.available !== false,
      source: 'swiggy_api',
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Normalizes Zomato API response into NormalizedFoodItem
   */
  public static normalizeZomatoItem(rawRestaurant: any, rawItem: any): NormalizedFoodItem {
    const rawPrice = rawItem.price !== undefined && rawItem.price !== null
      ? Number(rawItem.price)
      : (rawItem.item_price !== undefined && rawItem.item_price !== null ? Number(rawItem.item_price) : null);
    const finalPrice = rawPrice !== null && !isNaN(rawPrice) ? rawPrice : null;

    return {
      platform: 'zomato',
      restaurantId: String(rawRestaurant?.id || rawRestaurant?.res_id || ''),
      restaurantName: String(rawRestaurant?.name || '').trim(),
      restaurantAddress: String(
        rawRestaurant?.location?.locality ||
        rawRestaurant?.location?.address ||
        rawRestaurant?.address ||
        ''
      ).trim(),
      itemId: String(rawItem?.id || rawItem?.item_id || rawItem?.dish_id || ''),
      itemName: String(rawItem?.name || rawItem?.dish_name || '').trim(),
      description: String(rawItem?.description || '').trim(),
      variant: rawItem?.variant || rawItem?.portion || null,
      price: finalPrice,
      currency: String(rawItem?.currency || 'INR'),
      available: rawItem?.available !== false && rawItem?.is_available !== false,
      source: 'zomato_api',
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Generic normalizer fallback
   */
  public static normalizeGeneric(platform: string, rawRestaurant: any, rawItem: any): NormalizedFoodItem {
    const rawPrice = rawItem?.price !== undefined && rawItem?.price !== null ? Number(rawItem.price) : null;
    const finalPrice = rawPrice !== null && !isNaN(rawPrice) ? rawPrice : null;

    return {
      platform: platform.toLowerCase(),
      restaurantId: String(rawRestaurant?.id || rawRestaurant?.restaurantId || ''),
      restaurantName: String(rawRestaurant?.name || '').trim(),
      restaurantAddress: String(rawRestaurant?.address || rawRestaurant?.location || '').trim(),
      itemId: String(rawItem?.id || rawItem?.itemId || ''),
      itemName: String(rawItem?.name || rawItem?.itemName || '').trim(),
      description: String(rawItem?.description || '').trim(),
      variant: rawItem?.variant || null,
      price: finalPrice,
      currency: String(rawItem?.currency || 'INR'),
      available: Boolean(rawItem?.available ?? rawItem?.isAvailable ?? true),
      source: `${platform.toLowerCase()}_api`,
      fetchedAt: new Date().toISOString()
    };
  }
}

import { CanonicalFoodEngine } from '../engine/CanonicalFoodModel.js';

export interface CanonicalFoodItem {
  provider: string;
  providerItemId: string;
  restaurant: {
    id: string;
    name: string;
    location: string;
    latitude?: number;
    longitude?: number;
  };
  item: {
    name: string;
    description: string;
    category: string;
    vegetarian: boolean | null;
    quantity?: string;
    image?: string;
  };
  pricing: {
    basePrice: number;
    discount: number;
    packagingFee: number | null;
    deliveryFee: number | null;
    taxes: number | null;
    finalPrice: number | null;
  };
  availability: boolean;
  fetchedAt: string;
}

export class NormalizationService {
  /**
   * Normalizes raw Swiggy data to CanonicalFoodItem
   */
  public static normalizeSwiggy(rawRestaurant: any, rawItem: any): CanonicalFoodItem {
    const canonical = CanonicalFoodEngine.resolveCanonical(
      rawItem.name || '',
      rawItem.description,
      rawItem.isVeg ?? rawItem.vegetarian
    );

    const basePrice = Number(rawItem.price || 0);
    const discount = Number(rawItem.discount || 0);

    // Represent unknown fees as null, NOT 0
    const packagingFee = rawItem.packagingFee !== undefined ? Number(rawItem.packagingFee) : null;
    const deliveryFee = rawItem.deliveryFee !== undefined ? Number(rawItem.deliveryFee) : null;
    const taxes = rawItem.taxes !== undefined ? Number(rawItem.taxes) : null;

    // Calculate finalPrice only if known or base is applicable
    let finalPrice: number | null = null;
    if (packagingFee !== null && deliveryFee !== null && taxes !== null) {
      finalPrice = Math.max(0, basePrice - discount + packagingFee + deliveryFee + taxes);
    } else {
      // If full checkout fees are unknown, final price cannot be claimed as complete
      finalPrice = Math.max(0, basePrice - discount);
    }

    return {
      provider: 'swiggy',
      providerItemId: String(rawItem.menuItemId || rawItem.id || `swiggy_${Date.now()}`),
      restaurant: {
        id: String(rawRestaurant.restaurantId || rawRestaurant.id || ''),
        name: rawRestaurant.name || '',
        location: rawRestaurant.branchName || rawRestaurant.area || rawRestaurant.city || '',
        latitude: rawRestaurant.latitude,
        longitude: rawRestaurant.longitude
      },
      item: {
        name: rawItem.name || '',
        description: rawItem.description || '',
        category: canonical.category || rawItem.category || 'Main Course',
        vegetarian: rawItem.isVeg ?? (canonical.diet === 'vegetarian'),
        quantity: rawItem.portionSize || rawItem.quantity || undefined,
        image: rawItem.image || undefined
      },
      pricing: {
        basePrice,
        discount,
        packagingFee,
        deliveryFee,
        taxes,
        finalPrice
      },
      availability: rawItem.isAvailable !== false,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Normalizes raw Zomato data to CanonicalFoodItem
   */
  public static normalizeZomato(rawRestaurant: any, rawItem: any): CanonicalFoodItem {
    const canonical = CanonicalFoodEngine.resolveCanonical(
      rawItem.name || '',
      rawItem.description,
      rawItem.isVeg
    );

    const basePrice = Number(rawItem.price || 0);
    const discount = Number(rawItem.discount || 0);

    // Represent unknown fees as null, NOT 0
    const packagingFee = rawItem.packagingFee !== undefined ? Number(rawItem.packagingFee) : null;
    const deliveryFee = rawItem.deliveryFee !== undefined ? Number(rawItem.deliveryFee) : null;
    const taxes = rawItem.taxes !== undefined ? Number(rawItem.taxes) : null;

    let finalPrice: number | null = null;
    if (packagingFee !== null && deliveryFee !== null && taxes !== null) {
      finalPrice = Math.max(0, basePrice - discount + packagingFee + deliveryFee + taxes);
    } else {
      finalPrice = Math.max(0, basePrice - discount);
    }

    return {
      provider: 'zomato',
      providerItemId: String(rawItem.id || `zomato_${Date.now()}`),
      restaurant: {
        id: String(rawRestaurant.id || ''),
        name: rawRestaurant.name || '',
        location: rawRestaurant.location || rawRestaurant.locality || '',
        latitude: rawRestaurant.latitude,
        longitude: rawRestaurant.longitude
      },
      item: {
        name: rawItem.name || '',
        description: rawItem.description || '',
        category: canonical.category || 'Main Course',
        vegetarian: rawItem.isVeg ?? (canonical.diet === 'vegetarian'),
        quantity: rawItem.quantity || undefined,
        image: rawItem.image || undefined
      },
      pricing: {
        basePrice,
        discount,
        packagingFee,
        deliveryFee,
        taxes,
        finalPrice
      },
      availability: rawItem.availability !== false,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Normalizes database product rows to CanonicalFoodItem
   */
  public static normalizeCatalogRow(row: any, platformCode: string): CanonicalFoodItem {
    const basePrice = Number(row.item_price || 0);
    const discount = Number(row.discount || 0);
    const packagingFee = row.packaging_fee !== undefined && row.packaging_fee !== null ? Number(row.packaging_fee) : null;
    const deliveryFee = row.delivery_fee !== undefined && row.delivery_fee !== null ? Number(row.delivery_fee) : null;
    const taxes = row.taxes !== undefined && row.taxes !== null ? Number(row.taxes) : null;
    const finalPrice = row.final_price !== undefined && row.final_price !== null ? Number(row.final_price) : null;

    return {
      provider: platformCode,
      providerItemId: String(row.product_id || row.id || ''),
      restaurant: {
        id: String(row.restaurant_id || ''),
        name: row.restaurant_name || '',
        location: row.branch_area || row.branch_name || row.branch_city || '',
        latitude: row.latitude ? Number(row.latitude) : undefined,
        longitude: row.longitude ? Number(row.longitude) : undefined
      },
      item: {
        name: row.product_name || '',
        description: row.product_description || '',
        category: row.category || 'Main Course',
        vegetarian: row.vegetarian === 1 || row.vegetarian === true,
        quantity: row.portion_size ? `${row.portion_size} ${row.portion_unit || ''}`.trim() : undefined,
        image: row.image || undefined
      },
      pricing: {
        basePrice,
        discount,
        packagingFee,
        deliveryFee,
        taxes,
        finalPrice
      },
      availability: Boolean(row.availability),
      fetchedAt: row.updated_at || new Date().toISOString()
    };
  }
}

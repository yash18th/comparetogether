import { CanonicalFoodItem } from './NormalizationService.js';

export interface ComparablePriceResult {
  menuPrice: number;
  discount: number;
  packagingFee: number | null;
  deliveryFee: number | null;
  taxes: number | null;
  finalPrice: number | null;
  isComplete: boolean;
  status: 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE';
  notes: string[];
}

export interface PairwiseComparisonResult {
  restaurantName: string;
  location: string;
  dishName: string;
  swiggy: {
    menuPrice: number | null;
    finalPrice: number | null;
    status: string;
  };
  zomato: {
    menuPrice: number | null;
    finalPrice: number | null;
    status: string;
  };
  difference: number | null;
  lowerObservedProvider: 'swiggy' | 'zomato' | 'equal' | null;
  canCompareFinalPrice: boolean;
  summaryNote: string;
}

export class PriceEngine {
  /**
   * Calculates comparable price for an individual canonical item
   * Preserves null when fees are unprovided; never fabricates 0 for unknown fees.
   */
  public static calculateComparablePrice(pricing: CanonicalFoodItem['pricing']): ComparablePriceResult {
    const menuPrice = Math.max(0, pricing.basePrice || 0);
    const discount = Math.max(0, pricing.discount || 0);
    const notes: string[] = [];

    const packagingFee = pricing.packagingFee;
    const deliveryFee = pricing.deliveryFee;
    const taxes = pricing.taxes;

    const hasMissingFees = packagingFee === null || deliveryFee === null || taxes === null;

    if (hasMissingFees) {
      notes.push('Delivery fee, packaging, or taxes not provided by provider API prior to checkout.');
      return {
        menuPrice,
        discount,
        packagingFee,
        deliveryFee,
        taxes,
        finalPrice: pricing.finalPrice ?? (menuPrice - discount),
        isComplete: false,
        status: 'PARTIAL',
        notes
      };
    }

    const calculatedFinal = Math.max(
      0,
      menuPrice - discount + (packagingFee || 0) + (deliveryFee || 0) + (taxes || 0)
    );

    return {
      menuPrice,
      discount,
      packagingFee,
      deliveryFee,
      taxes,
      finalPrice: calculatedFinal,
      isComplete: true,
      status: 'COMPLETE',
      notes
    };
  }

  /**
   * Compares two provider items side-by-side
   * Only declares a lower observed price when both have comparable final pricing.
   */
  public static comparePair(
    swiggyItem?: CanonicalFoodItem,
    zomatoItem?: CanonicalFoodItem
  ): PairwiseComparisonResult {
    const swiggyPricing = swiggyItem ? PriceEngine.calculateComparablePrice(swiggyItem.pricing) : null;
    const zomatoPricing = zomatoItem ? PriceEngine.calculateComparablePrice(zomatoItem.pricing) : null;

    const dishName = swiggyItem?.item.name || zomatoItem?.item.name || 'Dish';
    const restaurantName = swiggyItem?.restaurant.name || zomatoItem?.restaurant.name || 'Restaurant';
    const location = swiggyItem?.restaurant.location || zomatoItem?.restaurant.location || '';

    const swiggyFinal = swiggyPricing?.finalPrice ?? null;
    const zomatoFinal = zomatoPricing?.finalPrice ?? null;

    // Both final prices must be valid numbers to calculate difference and lower price
    let difference: number | null = null;
    let lowerObservedProvider: 'swiggy' | 'zomato' | 'equal' | null = null;
    let canCompareFinalPrice = false;
    let summaryNote = '';

    if (swiggyFinal !== null && zomatoFinal !== null) {
      difference = Math.abs(swiggyFinal - zomatoFinal);
      canCompareFinalPrice = true;
      if (swiggyFinal < zomatoFinal) {
        lowerObservedProvider = 'swiggy';
        summaryNote = `Swiggy is ₹${difference} lower for observed final price`;
      } else if (zomatoFinal < swiggyFinal) {
        lowerObservedProvider = 'zomato';
        summaryNote = `Zomato is ₹${difference} lower for observed final price`;
      } else {
        lowerObservedProvider = 'equal';
        summaryNote = 'Both platforms offer equal observed final price';
      }
    } else {
      canCompareFinalPrice = false;
      summaryNote = 'Final price comparison pending complete checkout data from both providers';
    }

    return {
      restaurantName,
      location,
      dishName,
      swiggy: {
        menuPrice: swiggyPricing?.menuPrice ?? null,
        finalPrice: swiggyFinal,
        status: swiggyPricing?.status || (swiggyItem ? 'AVAILABLE' : 'UNAVAILABLE')
      },
      zomato: {
        menuPrice: zomatoPricing?.menuPrice ?? null,
        finalPrice: zomatoFinal,
        status: zomatoPricing?.status || (zomatoItem ? 'AVAILABLE' : 'UNAVAILABLE')
      },
      difference,
      lowerObservedProvider,
      canCompareFinalPrice,
      summaryNote
    };
  }
}

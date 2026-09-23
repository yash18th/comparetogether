import { NormalizedPricing, NormalizedPlatformProduct } from '../adapters/PlatformAdapter.js';

export interface PortionMetric {
  portionSize: number;
  unit: string;
  pricePer100Unit: number;
  formattedMetric: string;
}

export interface ComparedProductSummary {
  productId: string;
  productName: string;
  restaurantName: string;
  branchName: string;
  branchArea: string;
  portionSize?: number;
  portionUnit?: string;
  portionComparison?: {
    cheapestPer100g: number;
    platformCode: string;
    metricsByPlatform: Record<string, PortionMetric>;
  };
  prices: NormalizedPricing[];
  normalizedProducts?: NormalizedPlatformProduct[];
  cheapestFinalPrice: number;
  cheapestPlatformCode: string;
  cheapestItemPrice: number;
  highestFinalPrice: number;
  maxSavings: number; // You save ₹X compared with the highest available total
  savingsText: string;
  cartComparison?: {
    itemPrice: Record<string, number | null>;
    addons: Record<string, number>;
    deliveryFee: Record<string, number | null | 'Unavailable'>;
    platformFee: Record<string, number | null | 'Unavailable'>;
    packagingFee: Record<string, number | null | 'Unavailable'>;
    taxes: Record<string, number | null | 'Unavailable'>;
    discounts: Record<string, number>;
    potentialDiscounts: Record<string, string[]>;
    finalPayable: Record<string, number | null | 'Unavailable'>;
  };
}

export class NormalizationEngine {
  /**
   * Normalizes and aggregates multi-platform pricing for a product
   */
  public static comparePlatforms(
    productId: string,
    productName: string,
    restaurantName: string,
    branchName: string,
    branchArea: string,
    portionSize: number | undefined,
    portionUnit: string | undefined,
    prices: NormalizedPricing[],
    normalizedProducts?: NormalizedPlatformProduct[]
  ): ComparedProductSummary {
    if (prices.length === 0 && (!normalizedProducts || normalizedProducts.length === 0)) {
      return {
        productId,
        productName,
        restaurantName,
        branchName,
        branchArea,
        portionSize,
        portionUnit,
        portionComparison: undefined,
        prices: [],
        normalizedProducts: [],
        cheapestFinalPrice: 0,
        cheapestPlatformCode: '',
        cheapestItemPrice: 0,
        highestFinalPrice: 0,
        maxSavings: 0,
        savingsText: 'No platform prices available for this dish yet.'
      };
    }

    // Filter available platforms
    const validPrices = prices.filter(p => p.availability && p.itemPrice > 0);

    // Platforms with complete, verified checkout fee breakdowns
    const verifiedPrices = validPrices.filter(p => !p.finalPriceUnavailable && p.finalPrice > 0);

    let cheapestFinal = verifiedPrices.length > 0 ? verifiedPrices[0].finalPrice : 0;
    let cheapestPlatform = verifiedPrices.length > 0 ? verifiedPrices[0].platformCode : '';
    let cheapestItem = validPrices.length > 0 ? validPrices[0].itemPrice : 0;
    let highestFinal = verifiedPrices.length > 0 ? verifiedPrices[0].finalPrice : 0;

    for (const p of validPrices) {
      if (p.itemPrice < cheapestItem) {
        cheapestItem = p.itemPrice;
      }
    }

    for (const p of verifiedPrices) {
      if (p.finalPrice < cheapestFinal) {
        cheapestFinal = p.finalPrice;
        cheapestPlatform = p.platformCode;
      }
      if (p.finalPrice > highestFinal) {
        highestFinal = p.finalPrice;
      }
    }

    const maxSavings = verifiedPrices.length >= 2 ? Math.max(0, highestFinal - cheapestFinal) : 0;
    const cheapestPlatformCode = verifiedPrices.length >= 1 ? cheapestPlatform : '';
    const savingsText = verifiedPrices.length >= 2 && maxSavings > 0
      ? `You save ₹${maxSavings} compared with the highest verified total.`
      : verifiedPrices.length >= 2
        ? 'Verified prices are identical across platforms.'
        : 'Comparison unavailable for some platforms';

    // Portion calculations if portionSize is available and > 0
    let portionComparison = undefined;
    if (portionSize && portionSize > 0 && (portionUnit === 'g' || portionUnit === 'ml')) {
      const metricsByPlatform: Record<string, PortionMetric> = {};
      let cheapestPer100 = Infinity;
      let cheapestPer100Platform = '';

      for (const p of validPrices) {
        const basePrice = p.finalPrice > 0 && !p.finalPriceUnavailable ? p.finalPrice : p.itemPrice;
        const pricePer100 = Math.round((basePrice / portionSize) * 100 * 10) / 10;
        metricsByPlatform[p.platformCode] = {
          portionSize,
          unit: portionUnit,
          pricePer100Unit: pricePer100,
          formattedMetric: `₹${pricePer100} / 100${portionUnit}`
        };

        if (pricePer100 < cheapestPer100) {
          cheapestPer100 = pricePer100;
          cheapestPer100Platform = p.platformCode;
        }
      }

      portionComparison = {
        cheapestPer100g: cheapestPer100,
        platformCode: cheapestPer100Platform,
        metricsByPlatform
      };
    }

    // Build Cart-Level comparison map
    const cartComparison: ComparedProductSummary['cartComparison'] = {
      itemPrice: {},
      addons: {},
      deliveryFee: {},
      platformFee: {},
      packagingFee: {},
      taxes: {},
      discounts: {},
      potentialDiscounts: {},
      finalPayable: {}
    };

    if (normalizedProducts && normalizedProducts.length > 0) {
      for (const np of normalizedProducts) {
        cartComparison.itemPrice[np.platformCode] = np.itemPrice;
        cartComparison.addons[np.platformCode] = np.addonTotal;
        cartComparison.deliveryFee[np.platformCode] = np.deliveryFee;
        cartComparison.platformFee[np.platformCode] = np.platformFee;
        cartComparison.packagingFee[np.platformCode] = np.packagingFee;
        cartComparison.taxes[np.platformCode] = np.taxes;
        cartComparison.discounts[np.platformCode] = np.discount + np.couponDiscount;
        cartComparison.potentialDiscounts[np.platformCode] = np.potentialDiscounts || [];
        cartComparison.finalPayable[np.platformCode] = np.finalPrice;
      }
    } else {
      for (const p of validPrices) {
        cartComparison.itemPrice[p.platformCode] = p.itemPrice;
        cartComparison.addons[p.platformCode] = p.addons;
        cartComparison.deliveryFee[p.platformCode] = p.finalPriceUnavailable ? 'Unavailable' : p.deliveryFee;
        cartComparison.platformFee[p.platformCode] = p.finalPriceUnavailable ? 'Unavailable' : p.platformFee;
        cartComparison.packagingFee[p.platformCode] = p.finalPriceUnavailable ? 'Unavailable' : p.packagingFee;
        cartComparison.taxes[p.platformCode] = p.finalPriceUnavailable ? 'Unavailable' : p.taxes;
        cartComparison.discounts[p.platformCode] = p.discount + (p.membershipApplied ? p.membershipDiscount : 0);
        cartComparison.potentialDiscounts[p.platformCode] = [];
        cartComparison.finalPayable[p.platformCode] = p.finalPriceUnavailable ? 'Unavailable' : p.finalPrice;
      }
    }

    return {
      productId,
      productName,
      restaurantName,
      branchName,
      branchArea,
      portionSize,
      portionUnit,
      portionComparison,
      prices: validPrices,
      normalizedProducts,
      cheapestFinalPrice: verifiedPrices.length >= 2 ? cheapestFinal : (verifiedPrices.length === 1 ? verifiedPrices[0].finalPrice : 0),
      cheapestPlatformCode,
      cheapestItemPrice: cheapestItem,
      highestFinalPrice: highestFinal,
      maxSavings,
      savingsText,
      cartComparison
    };
  }
}

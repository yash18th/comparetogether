import { NormalizedPricing } from '../adapters/PlatformAdapter.js';

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
  cheapestFinalPrice: number;
  cheapestPlatformCode: string;
  cheapestItemPrice: number;
  highestFinalPrice: number;
  maxSavings: number; // You save ₹X compared with the highest available total
  savingsText: string;
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
    prices: NormalizedPricing[]
  ): ComparedProductSummary {
    if (prices.length === 0) {
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
    const savingsText = verifiedPrices.length >= 2 && maxSavings > 0
      ? `You save ₹${maxSavings} compared with the highest verified total.`
      : verifiedPrices.length >= 2
        ? 'Verified prices are identical across platforms.'
        : 'Transparent item prices shown. Some platform checkout fees require live session.';

    // Portion calculations if portionSize is available and > 0
    let portionComparison = undefined;
    if (portionSize && portionSize > 0 && (portionUnit === 'g' || portionUnit === 'ml')) {
      const metricsByPlatform: Record<string, PortionMetric> = {};
      let cheapestPer100 = Infinity;
      let cheapestPer100Platform = '';

      for (const p of validPrices) {
        // Calculate per 100g using final payable price
        const pricePer100 = Math.round((p.finalPrice / portionSize) * 100 * 10) / 10;
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
      cheapestFinalPrice: cheapestFinal,
      cheapestPlatformCode: cheapestPlatform,
      cheapestItemPrice: cheapestItem,
      highestFinalPrice: highestFinal,
      maxSavings,
      savingsText
    };
  }
}

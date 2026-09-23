/**
 * Price Engine
 * Computes MENU PRICE vs EFFECTIVE PRICE with exact fee breakdowns.
 * Strictly avoids inventing or fabricating unavailable fee components.
 */

export interface PriceComponent<T = number> {
  value: T | null;
  status: 'available' | 'not_provided' | 'waived';
  formatted: string;
}

export interface PricingInputData {
  itemPrice: number;
  discount?: number | null;
  deliveryFee?: number | null;
  platformFee?: number | null;
  packagingFee?: number | null;
  taxes?: number | null;
  otherCharges?: number | null;
  membershipDiscount?: number | null;
  hasMembership?: boolean;
}

export interface PriceBreakdown {
  menuPrice: number;
  discount: PriceComponent<number>;
  deliveryFee: PriceComponent<number>;
  platformFee: PriceComponent<number>;
  packagingFee: PriceComponent<number>;
  taxes: PriceComponent<number>;
  otherCharges: PriceComponent<number>;
  effectivePrice: number | null;
  isEffectivePriceComplete: boolean;
  notes: string[];
}

export class PriceEngine {
  /**
   * Helper to format a fee component without making up values
   */
  private static formatComponent(val: number | null | undefined, label: string): PriceComponent<number> {
    if (val === undefined || val === null) {
      return {
        value: null,
        status: 'not_provided',
        formatted: 'Not provided'
      };
    }
    if (val === 0) {
      return {
        value: 0,
        status: 'waived',
        formatted: '₹0 (Free)'
      };
    }
    return {
      value: val,
      status: 'available',
      formatted: `₹${val.toFixed(2)}`
    };
  }

  /**
   * Calculates menu price vs effective price strictly from real, provided data
   */
  public static calculate(input: PricingInputData): PriceBreakdown {
    const menuPrice = Math.max(0, input.itemPrice || 0);
    const notes: string[] = [];

    // Base discount
    let totalDiscount = 0;
    if (typeof input.discount === 'number' && input.discount > 0) {
      totalDiscount += input.discount;
    }
    if (input.hasMembership && typeof input.membershipDiscount === 'number' && input.membershipDiscount > 0) {
      totalDiscount += input.membershipDiscount;
      notes.push(`Membership discount applied: ₹${input.membershipDiscount}`);
    }

    const discountComp = PriceEngine.formatComponent(totalDiscount > 0 ? totalDiscount : (input.discount ?? null), 'discount');
    const deliveryComp = PriceEngine.formatComponent(input.deliveryFee, 'delivery');
    const platformComp = PriceEngine.formatComponent(input.platformFee, 'platform');
    const packagingComp = PriceEngine.formatComponent(input.packagingFee, 'packaging');
    const taxesComp = PriceEngine.formatComponent(input.taxes, 'taxes');
    const otherComp = PriceEngine.formatComponent(input.otherCharges, 'other');

    // Check if any mandatory checkout components are not provided
    // If fees are missing from provider, effective price cannot be claimed as final verified total
    let effectivePrice: number | null = menuPrice - totalDiscount;
    let isComplete = true;

    if (deliveryComp.status === 'available') {
      effectivePrice += deliveryComp.value!;
    } else if (deliveryComp.status === 'not_provided') {
      isComplete = false;
    }

    if (platformComp.status === 'available') {
      effectivePrice += platformComp.value!;
    } else if (platformComp.status === 'not_provided') {
      isComplete = false;
    }

    if (packagingComp.status === 'available') {
      effectivePrice += packagingComp.value!;
    } else if (packagingComp.status === 'not_provided') {
      isComplete = false;
    }

    if (taxesComp.status === 'available') {
      effectivePrice += taxesComp.value!;
    } else if (taxesComp.status === 'not_provided') {
      isComplete = false;
    }

    if (otherComp.status === 'available') {
      effectivePrice += otherComp.value!;
    }

    if (!isComplete) {
      notes.push('Some fees (delivery, platform, taxes) are not provided by platform API without live cart authentication.');
    }

    return {
      menuPrice,
      discount: discountComp,
      deliveryFee: deliveryComp,
      platformFee: platformComp,
      packagingFee: packagingComp,
      taxes: taxesComp,
      otherCharges: otherComp,
      effectivePrice: isComplete ? Math.max(0, effectivePrice) : null,
      isEffectivePriceComplete: isComplete,
      notes
    };
  }
}

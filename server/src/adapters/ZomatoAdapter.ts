import {
  PlatformAdapter,
  PlatformMetadata,
  PricingInput,
  NormalizedPricing,
  NormalizedPlatformProduct,
  PlatformDataStatus
} from './PlatformAdapter.js';

export class ZomatoAdapter implements PlatformAdapter {
  metadata: PlatformMetadata = {
    id: 'plat_zomato',
    name: 'Zomato',
    code: 'zomato',
    logoUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=80&h=80&fit=crop',
    integrationStatus: 'pending',
    dataProvenance: 'INTEGRATION_PENDING',
    isOfficial: true,
    legalNotice: 'Official Zomato integration requires authorized enterprise merchant/partner API credentials. Static heuristic estimations are strictly prohibited.',
    orderUrlTemplate: 'https://www.zomato.com/bangalore/{restaurantSlug}/order'
  };

  private apiKey?: string;
  private baseUrl?: string;

  constructor() {
    this.apiKey = process.env.ZOMATO_API_KEY;
    this.baseUrl = process.env.ZOMATO_BASE_URL || 'https://api.zomato.com/v2';
  }

  /**
   * Checks whether authorized API credentials have been configured
   */
  public isAuthorized(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Server-side authorized query to Zomato API (when configured)
   */
  public async fetchLivePricing(restaurantId: string, itemId: string, location?: { lat?: number; lng?: number }): Promise<any | null> {
    if (!this.isAuthorized()) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const endpoint = `${this.baseUrl}/order/quote`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Zomato-API-Key': this.apiKey!
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          item_id: itemId,
          latitude: location?.lat,
          longitude: location?.lng
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`Zomato API returned HTTP ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.warn('Zomato live pricing fetch failed:', err);
      return null;
    }
  }

  /**
   * Standardized NormalizedPlatformProduct return
   * NEVER fabricates fake delivery, platform, or packaging fees.
   */
  public getNormalizedProduct(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPlatformProduct {
    const itemPrice = input.itemPrice || 0;
    const addons = input.addons || 0;
    const subtotal = itemPrice + addons;
    const authorized = this.isAuthorized();
    const dataStatus: PlatformDataStatus = authorized ? 'AUTHORIZED' : 'INTEGRATION_PENDING';

    const unavailabilityReason = authorized
      ? undefined
      : 'Authorized Zomato API access required (ZOMATO_API_KEY missing). Integration pending merchant partner credentials.';

    return {
      platform: this.metadata.name,
      platformId: this.metadata.id,
      platformCode: this.metadata.code,
      restaurantId: input.restaurantId || restaurantSlug,
      restaurantName: input.restaurantName || restaurantSlug,
      branchId: input.branchId || '',
      branchName: input.branchName || input.branchArea || '',
      address: input.address,
      menuItemId: input.menuItemId || itemSlug,
      itemName: input.itemName || itemSlug,
      description: input.description,
      category: input.category,
      image: input.image,
      portion: input.portionSize ? { size: input.portionSize, unit: input.portionUnit || 'g' } : undefined,
      variants: input.variants || [],
      addons: [],
      availability: input.isAvailable !== false,

      itemPrice,
      addonTotal: addons,

      deliveryFee: 'Unavailable',
      platformFee: 'Unavailable',
      packagingFee: 'Unavailable',
      taxes: 'Unavailable',

      discount: 0,
      couponDiscount: 0,
      potentialDiscounts: ['Zomato Gold extra discounts available with eligible membership at checkout'],

      subtotal,
      finalPrice: 'Unavailable',

      currency: 'INR',
      fetchedAt: new Date().toISOString(),
      dataStatus,
      unavailabilityReason,
      orderUrl: this.getDeepLink(restaurantSlug, itemSlug)
    };
  }

  /**
   * Backwards-compatible pricing representation
   */
  public calculatePricing(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPricing {
    const authorized = this.isAuthorized();
    const itemPrice = input.itemPrice || 0;
    const addons = input.addons || 0;

    return {
      platformId: this.metadata.id,
      platformName: this.metadata.name,
      platformCode: this.metadata.code,
      itemPrice,
      addons,
      deliveryFee: 0,
      platformFee: 0,
      packagingFee: 0,
      taxes: 0,
      discount: 0,
      finalPrice: itemPrice + addons,
      finalPriceUnavailable: true,
      unavailabilityReason: authorized
        ? 'Live checkout quote required for verified final payable price'
        : 'Authorized Zomato API access required. Integration pending partner credentials.',
      membershipDiscount: 0,
      membershipApplied: false,
      membershipPlanName: 'Zomato Gold',
      estimatedDeliveryMin: 30,
      currency: 'INR',
      orderUrl: this.getDeepLink(restaurantSlug, itemSlug),
      availability: input.isAvailable !== false,
      sourceType: 'authorized_api',
      dataProvenance: authorized ? 'AUTHORIZED' : 'INTEGRATION_PENDING',
      lastUpdated: new Date().toISOString()
    };
  }

  public getDeepLink(restaurantSlug: string, itemSlug?: string): string {
    const base = `https://www.zomato.com/bangalore/${restaurantSlug}/order`;
    return itemSlug ? `${base}?item=${encodeURIComponent(itemSlug)}` : base;
  }

  public isAvailable(area: string): boolean {
    return true;
  }
}

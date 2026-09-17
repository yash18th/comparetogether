import {
  PlatformAdapter,
  PlatformMetadata,
  PricingInput,
  NormalizedPricing,
  NormalizedPlatformProduct,
  PlatformDataStatus
} from './PlatformAdapter.js';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';

export class SwiggyAdapter implements PlatformAdapter {
  metadata: PlatformMetadata = {
    id: 'plat_swiggy',
    name: 'Swiggy',
    code: 'swiggy',
    logoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=80&fit=crop',
    integrationStatus: 'pending',
    dataProvenance: 'INTEGRATION_PENDING',
    isOfficial: true,
    legalNotice: 'Official Swiggy Builders Club / Food MCP Integration (OAuth 2.1 + PKCE). Real platform data is only displayed when authorized.',
    orderUrlTemplate: 'https://www.swiggy.com/restaurants/{restaurantSlug}'
  };

  /**
   * Standardized NormalizedPlatformProduct return
   */
  public getNormalizedProduct(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPlatformProduct {
    const swiggyClient = SwiggyMcpClient.getInstance();
    const status = swiggyClient.getStatus(input.userId);

    const isAuthorized = status.connected && status.status === 'AUTHORIZED';
    const dataStatus: PlatformDataStatus = isAuthorized ? 'AUTHORIZED' : 'INTEGRATION_PENDING';

    const itemPrice = input.itemPrice || 0;
    const addons = input.addons || 0;
    const subtotal = itemPrice + addons;

    if (isAuthorized) {
      // Live session available
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
        potentialDiscounts: ['Swiggy One free delivery and member discounts eligible upon checkout'],

        subtotal,
        finalPrice: 'Unavailable',

        currency: 'INR',
        fetchedAt: status.lastUpdated || new Date().toISOString(),
        dataStatus: 'AUTHORIZED',
        unavailabilityReason: 'Live checkout session required for final payable fee breakdown',
        orderUrl: this.getDeepLink(restaurantSlug, itemSlug)
      };
    }

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

      subtotal,
      finalPrice: 'Unavailable',

      currency: 'INR',
      fetchedAt: new Date().toISOString(),
      dataStatus: 'INTEGRATION_PENDING',
      unavailabilityReason: 'Swiggy MCP integration pending. User OAuth 2.1 authorization required.',
      orderUrl: this.getDeepLink(restaurantSlug, itemSlug)
    };
  }

  /**
   * Calculates pricing strictly based on real platform state.
   * NEVER invents fake delivery fees, fake platform fees, or fake coupons.
   */
  public calculatePricing(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPricing {
    const swiggyClient = SwiggyMcpClient.getInstance();
    const status = swiggyClient.getStatus(input.userId);

    const isAuthorized = status.connected && status.status === 'AUTHORIZED';
    const itemPrice = input.itemPrice || 0;
    const addons = input.addons || 0;

    if (isAuthorized) {
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
        unavailabilityReason: 'Live delivery & platform fees require active cart checkout quote',
        membershipDiscount: 0,
        membershipApplied: Boolean(input.hasMembership),
        membershipPlanName: 'Swiggy One',
        estimatedDeliveryMin: 30,
        currency: 'INR',
        orderUrl: this.getDeepLink(restaurantSlug, itemSlug),
        availability: true,
        sourceType: 'authorized_api',
        dataProvenance: 'AUTHORIZED',
        lastUpdated: status.lastUpdated || new Date().toISOString()
      };
    }

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
      finalPrice: itemPrice,
      finalPriceUnavailable: true,
      unavailabilityReason: 'Swiggy MCP integration pending. Final payable price unavailable without authorized session.',
      membershipDiscount: 0,
      membershipApplied: false,
      membershipPlanName: undefined,
      estimatedDeliveryMin: 0,
      currency: 'INR',
      orderUrl: this.getDeepLink(restaurantSlug, itemSlug),
      availability: false,
      sourceType: 'authorized_api',
      dataProvenance: 'INTEGRATION_PENDING',
      lastUpdated: new Date().toISOString()
    };
  }

  public getDeepLink(restaurantSlug: string, itemSlug?: string): string {
    const base = `https://www.swiggy.com/restaurants/${restaurantSlug}`;
    return itemSlug ? `${base}?search=${encodeURIComponent(itemSlug)}` : base;
  }

  public isAvailable(area: string): boolean {
    const swiggyClient = SwiggyMcpClient.getInstance();
    const status = swiggyClient.getStatus();
    return status.connected;
  }
}

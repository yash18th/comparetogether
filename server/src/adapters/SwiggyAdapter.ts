import { PlatformAdapter, PlatformMetadata, PricingInput, NormalizedPricing, PlatformDataProvenance } from './PlatformAdapter.js';
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
   * Calculates pricing strictly based on real platform state.
   * NEVER invents fake delivery fees, fake platform fees, or fake coupons.
   */
  calculatePricing(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPricing {
    const swiggyClient = SwiggyMcpClient.getInstance();
    const status = swiggyClient.getStatus();

    const isAuthorized = status.connected && status.status === 'AUTHORIZED';
    const provenance: PlatformDataProvenance = isAuthorized ? 'AUTHORIZED' : 'INTEGRATION_PENDING';

    const itemPrice = input.itemPrice || 0;
    const addons = input.addons || 0;

    // If Swiggy MCP is authorized and live
    if (isAuthorized) {
      // In live MCP mode, fees come directly from live cart or menu quotes
      // When line-item fee breakdown is not yet finalized via live cart checkout:
      const hasFullBreakdown = false; // Until cart checkout returns exact delivery/platform/packaging fees

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
        finalPriceUnavailable: !hasFullBreakdown,
        unavailabilityReason: hasFullBreakdown ? undefined : 'Live delivery & platform fees require active cart checkout quote',
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

    // Swiggy is not connected: report honestly as INTEGRATION_PENDING
    // DO NOT invent delivery fees, platform fees, or mock calculations!
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

  getDeepLink(restaurantSlug: string, itemSlug?: string): string {
    const base = `https://www.swiggy.com/restaurants/${restaurantSlug}`;
    return itemSlug ? `${base}?search=${encodeURIComponent(itemSlug)}` : base;
  }

  isAvailable(area: string): boolean {
    const swiggyClient = SwiggyMcpClient.getInstance();
    const status = swiggyClient.getStatus();
    return status.connected;
  }
}

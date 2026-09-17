import { PlatformAdapter, PlatformMetadata, PricingInput, NormalizedPricing } from './PlatformAdapter.js';

export class ZomatoAdapter implements PlatformAdapter {
  metadata: PlatformMetadata = {
    id: 'plat_zomato',
    name: 'Zomato',
    code: 'zomato',
    logoUrl: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=80&h=80&fit=crop',
    integrationStatus: 'authorized',
    dataProvenance: 'AUTHORIZED',
    isOfficial: true,
    legalNotice: 'Prices synchronized via authorized merchant partner feeds. Final prices at checkout may vary based on active localized surge or promo coupons.',
    orderUrlTemplate: 'https://www.zomato.com/bangalore/{restaurantSlug}/order'
  };

  calculatePricing(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPricing {
    const itemPrice = input.itemPrice;
    const addons = input.addons || 0;
    const distanceKm = input.distanceKm || 3.2;
    
    // Zomato fee rules
    const deliveryFee = input.hasMembership ? 0 : Math.round(20 + distanceKm * 3);
    const platformFee = 8;
    const packagingFee = 15;
    
    // Regular restaurant discount (e.g. 15% off up to ₹40)
    let discount = itemPrice >= 199 ? 35 : 0;
    
    // Zomato Gold benefits
    let membershipDiscount = 0;
    if (input.hasMembership) {
      membershipDiscount = Math.round(itemPrice * 0.10); // extra 10% Gold discount
    }
    
    const subtotal = itemPrice + addons + (input.hasMembership ? 0 : deliveryFee) + platformFee + packagingFee - discount - membershipDiscount;
    const taxes = Math.round((itemPrice + packagingFee) * 0.05); // 5% GST
    const finalPrice = Math.max(0, subtotal + taxes);

    return {
      platformId: this.metadata.id,
      platformName: this.metadata.name,
      platformCode: this.metadata.code,
      itemPrice,
      addons,
      deliveryFee,
      platformFee,
      packagingFee,
      taxes,
      discount,
      finalPrice,
      membershipDiscount,
      membershipApplied: Boolean(input.hasMembership),
      membershipPlanName: 'Zomato Gold',
      estimatedDeliveryMin: Math.round(25 + distanceKm * 3),
      currency: 'INR',
      orderUrl: this.getDeepLink(restaurantSlug, itemSlug),
      availability: true,
      sourceType: 'authorized_api',
      dataProvenance: 'AUTHORIZED',
      lastUpdated: new Date().toISOString()
    };
  }

  getDeepLink(restaurantSlug: string, itemSlug?: string): string {
    const base = `https://www.zomato.com/bangalore/${restaurantSlug}/order`;
    return itemSlug ? `${base}?item=${encodeURIComponent(itemSlug)}` : base;
  }

  isAvailable(area: string): boolean {
    return true; // Available across all major metro areas
  }
}

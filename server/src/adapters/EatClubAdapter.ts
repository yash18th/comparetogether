import {
  PlatformAdapter,
  PlatformMetadata,
  PricingInput,
  NormalizedPricing,
  NormalizedPlatformProduct
} from './PlatformAdapter.js';

export class EatClubAdapter implements PlatformAdapter {
  metadata: PlatformMetadata = {
    id: 'plat_eatclub',
    name: 'EatClub',
    code: 'eatclub',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=80&h=80&fit=crop',
    integrationStatus: 'authorized',
    dataProvenance: 'AUTHORIZED',
    isOfficial: true,
    legalNotice: 'Authorized direct partner integration. EatClub operates on zero packaging and zero delivery fee model with direct club member discounts.',
    orderUrlTemplate: 'https://eatclub.in/restaurant/{restaurantSlug}'
  };

  public getNormalizedProduct(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPlatformProduct {
    const itemPrice = input.itemPrice || 0;
    const addons = input.addons || 0;
    const discount = Math.round(itemPrice * 0.20);
    const subtotal = itemPrice + addons - discount;
    const taxes = Math.round(subtotal * 0.05);
    const finalPrice = Math.max(0, subtotal + taxes);

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

      deliveryFee: 0,
      platformFee: 0,
      packagingFee: 0,
      taxes,

      discount,
      couponDiscount: 0,

      subtotal,
      finalPrice,

      currency: 'INR',
      fetchedAt: new Date().toISOString(),
      dataStatus: 'AUTHORIZED',
      orderUrl: this.getDeepLink(restaurantSlug, itemSlug)
    };
  }

  calculatePricing(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPricing {
    const itemPrice = input.itemPrice;
    const addons = input.addons || 0;

    // EatClub hallmark: 0 delivery fee, 0 platform fee, 0 packaging
    const deliveryFee = 0;
    const platformFee = 0;
    const packagingFee = 0;

    // Standard discount 20%
    const discount = Math.round(itemPrice * 0.20);
    const membershipDiscount = input.hasMembership ? Math.round(itemPrice * 0.10) : 0;

    const subtotal = itemPrice + addons - discount - membershipDiscount;
    const taxes = Math.round(subtotal * 0.05);
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
      membershipPlanName: 'EatClub Pass',
      estimatedDeliveryMin: 30,
      currency: 'INR',
      orderUrl: this.getDeepLink(restaurantSlug, itemSlug),
      availability: true,
      sourceType: 'authorized_api',
      dataProvenance: 'AUTHORIZED',
      lastUpdated: new Date().toISOString()
    };
  }

  getDeepLink(restaurantSlug: string, itemSlug?: string): string {
    const base = `https://eatclub.in/restaurant/${restaurantSlug}`;
    return itemSlug ? `${base}/${encodeURIComponent(itemSlug)}` : base;
  }

  isAvailable(area: string): boolean {
    return true;
  }
}

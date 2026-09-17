import {
  PlatformAdapter,
  PlatformMetadata,
  PricingInput,
  NormalizedPricing,
  NormalizedPlatformProduct
} from './PlatformAdapter.js';

export class DirectMerchantAdapter implements PlatformAdapter {
  metadata: PlatformMetadata = {
    id: 'plat_direct',
    name: 'Direct Restaurant Order',
    code: 'direct',
    logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=80&h=80&fit=crop',
    integrationStatus: 'partner_feed',
    dataProvenance: 'AUTHORIZED',
    isOfficial: true,
    legalNotice: 'Direct order via official restaurant web portal or merchant ordering line. 0% intermediary platform fee.',
    orderUrlTemplate: 'https://order.{restaurantSlug}.com'
  };

  public getNormalizedProduct(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPlatformProduct {
    const itemPrice = input.itemPrice || 0;
    const addons = input.addons || 0;
    const deliveryFee = itemPrice > 250 ? 0 : 25;
    const packagingFee = 10;
    const discount = Math.round(itemPrice * 0.10);
    const subtotal = itemPrice + addons + deliveryFee + packagingFee - discount;
    const taxes = Math.round((itemPrice + packagingFee) * 0.05);
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

      deliveryFee,
      platformFee: 0,
      packagingFee,
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

    // Direct ordering has 0 platform fee and modest packaging
    const deliveryFee = itemPrice > 250 ? 0 : 25;
    const platformFee = 0;
    const packagingFee = 10;
    const discount = Math.round(itemPrice * 0.10); // Direct 10% loyalty discount
    const membershipDiscount = 0;

    const subtotal = itemPrice + addons + deliveryFee + platformFee + packagingFee - discount;
    const taxes = Math.round((itemPrice + packagingFee) * 0.05);
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
      membershipApplied: false,
      estimatedDeliveryMin: 35,
      currency: 'INR',
      orderUrl: `https://${restaurantSlug}.com/order`,
      availability: true,
      sourceType: 'merchant_direct',
      dataProvenance: 'AUTHORIZED',
      lastUpdated: new Date().toISOString()
    };
  }

  getDeepLink(restaurantSlug: string, itemSlug?: string): string {
    return `https://${restaurantSlug}.com/menu`;
  }

  isAvailable(area: string): boolean {
    return true;
  }
}

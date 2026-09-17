import { PlatformAdapter, PlatformMetadata, PricingInput, NormalizedPricing } from './PlatformAdapter.js';

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

export type PlatformDataProvenance = 'LIVE' | 'AUTHORIZED' | 'MOCK' | 'UNAVAILABLE' | 'INTEGRATION_PENDING';

export interface PlatformMetadata {
  id: string;
  name: string;
  code: string;
  logoUrl: string;
  integrationStatus: 'authorized' | 'partner_feed' | 'pending';
  dataProvenance: PlatformDataProvenance;
  isOfficial: boolean;
  legalNotice: string;
  orderUrlTemplate: string;
}

export interface PricingInput {
  itemPrice: number;
  addons?: number;
  distanceKm?: number;
  itemCount?: number;
  hasMembership?: boolean;
  subtotal?: number;
  restaurantId?: string;
  branchArea?: string;
}

export interface NormalizedPricing {
  platformId: string;
  platformName: string;
  platformCode: string;
  itemPrice: number;
  addons: number;
  deliveryFee: number;
  platformFee: number;
  packagingFee: number;
  taxes: number;
  discount: number;
  finalPrice: number;
  finalPriceUnavailable?: boolean;
  unavailabilityReason?: string;
  membershipDiscount: number;
  membershipApplied: boolean;
  membershipPlanName?: string;
  estimatedDeliveryMin: number;
  currency: string;
  orderUrl: string;
  availability: boolean;
  sourceType: 'authorized_api' | 'partner_feed' | 'merchant_direct';
  dataProvenance: PlatformDataProvenance;
  lastUpdated: string;
}

export interface PlatformAdapter {
  metadata: PlatformMetadata;
  calculatePricing(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPricing;
  getDeepLink(restaurantSlug: string, itemSlug?: string): string;
  isAvailable(area: string): boolean;
}

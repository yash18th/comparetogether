export type PlatformDataStatus = 'LIVE' | 'AUTHORIZED' | 'MOCK' | 'UNAVAILABLE' | 'INTEGRATION_PENDING';
export type PlatformDataProvenance = PlatformDataStatus;

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
  restaurantName?: string;
  branchId?: string;
  branchName?: string;
  branchArea?: string;
  address?: string;
  menuItemId?: string;
  itemName?: string;
  description?: string;
  category?: string;
  image?: string;
  portionSize?: number;
  portionUnit?: string;
  variants?: any[];
  isAvailable?: boolean;
  userId?: string;
}

/**
 * Standardized Unified Platform Product & Pricing Schema
 */
export interface NormalizedPlatformProduct {
  platform: string;
  platformId?: string;
  platformCode: string;
  restaurantId: string;
  restaurantName: string;
  branchId: string;
  branchName: string;
  address?: string;
  menuItemId: string;
  itemName: string;
  description?: string;
  category?: string;
  image?: string;
  portion?: { size?: number; unit?: string };
  variants?: any[];
  addons?: any[];
  availability: boolean;

  itemPrice: number;
  addonTotal: number;

  deliveryFee: number | 'Unavailable';
  platformFee: number | 'Unavailable';
  packagingFee: number | 'Unavailable';
  taxes: number | 'Unavailable';

  discount: number;
  couponDiscount: number;
  potentialDiscounts?: string[];

  subtotal: number;
  finalPrice: number | 'Unavailable';

  currency: string;
  fetchedAt: string;
  dataStatus: PlatformDataStatus;
  unavailabilityReason?: string;
  orderUrl?: string;
}

// Backwards-compatible pricing representation
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
  getNormalizedProduct(input: PricingInput, restaurantSlug: string, itemSlug: string): NormalizedPlatformProduct;
  getDeepLink(restaurantSlug: string, itemSlug?: string): string;
  isAvailable(area: string): boolean;
}

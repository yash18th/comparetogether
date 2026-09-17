export interface Platform {
  id: string;
  name: string;
  code: string;
  logo_url: string;
  integration_status: 'authorized' | 'partner_feed' | 'pending';
  is_official: number;
}

export interface PlatformPrice {
  id: string;
  platform_id: string;
  item_price: number;
  delivery_fee: number;
  addons?: number;
  platform_fee: number;
  packaging_fee: number;
  taxes: number;
  discount: number;
  final_price: number;
  final_price_unavailable?: boolean;
  unavailability_reason?: string;
  data_provenance?: 'LIVE' | 'AUTHORIZED' | 'MOCK' | 'UNAVAILABLE' | 'INTEGRATION_PENDING';
  membership_discount: number;
  membership_type?: string;
  currency: string;
  order_url: string;
  availability: number;
  updated_at: string;
  platform_name: string;
  platform_code: string;
  platform_logo: string;
  integration_status: string;
  is_official: number;
  membership_applied?: boolean;
  active_membership_discount?: number;
  potential_discounts?: string[];
  last_updated_human?: string;
}

export interface SwiggyStatus {
  connected: boolean;
  status: 'LIVE' | 'AUTHORIZED' | 'INTEGRATION_PENDING' | 'EXPIRED' | 'UNAVAILABLE';
  address: {
    id: string;
    area?: string;
    city?: string;
    formattedAddress?: string;
  } | null;
  expiresAt: string | null;
  lastUpdated: string | null;
}

export interface SearchProductItem {
  product_id: string;
  product_name: string;
  product_description: string;
  product_category: string;
  product_cuisine: string;
  vegetarian: number;
  vegan: number;
  portion_size?: number;
  portion_unit?: string;
  product_image: string;
  branch_id: string;
  branch_name: string;
  branch_address: string;
  branch_area: string;
  branch_city: string;
  branch_pincode: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_logo: string;
  restaurant_rating: number;
  relevanceScore?: number;
  prices: PlatformPrice[];
  lowestFinalPrice: number;
  highestFinalPrice: number;
  lowestItemPrice: number;
  maxSavings: number;
  pricePer100g?: number | null;
  savingsText: string;
}

export interface ComparisonData {
  product: {
    product_id: string;
    product_name: string;
    product_description: string;
    category: string;
    cuisine: string;
    vegetarian: number;
    vegan: number;
    portion_size?: number;
    portion_unit?: string;
    image: string;
    branch_id: string;
    branch_name: string;
    branch_address: string;
    branch_city: string;
    branch_area: string;
    branch_pincode: string;
    restaurant_id: string;
    restaurant_name: string;
    restaurant_logo: string;
    restaurant_rating: number;
    restaurant_description: string;
  };
  prices: PlatformPrice[];
  comparison: {
    productId: string;
    productName: string;
    restaurantName: string;
    branchName: string;
    branchArea: string;
    portionSize?: number;
    portionUnit?: string;
    portionComparison?: {
      cheapestPer100g: number;
      platformCode: string;
      metricsByPlatform: Record<string, {
        portionSize: number;
        unit: string;
        pricePer100Unit: number;
        formattedMetric: string;
      }>;
    };
    cheapestFinalPrice: number;
    cheapestPlatformCode: string;
    cheapestItemPrice: number;
    highestFinalPrice: number;
    maxSavings: number;
    savingsText: string;
  };
  priceHistory: Array<{
    id: string;
    product_id: string;
    platform_id: string;
    price: number;
    recorded_at: string;
    platform_code: string;
    platform_name: string;
  }>;
  averagePrice30d: number;
  matches: Array<{
    id: string;
    platform_item_name: string;
    confidence_score: number;
    verification_status: string;
    platform_name: string;
    platform_code: string;
  }>;
  otherBranches: Array<{
    branch_id: string;
    branch_name: string;
    area: string;
    pincode: string;
    city: string;
  }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PriceAlert {
  alert_id: string;
  product_id: string;
  product_name: string;
  image: string;
  restaurant_name: string;
  branch_area: string;
  target_price: number;
  current_best_price: number;
  active: number;
  created_at: string;
}

export interface FavoriteItem {
  favorite_id: string;
  product_id: string;
  product_name: string;
  category: string;
  portion_size?: number;
  portion_unit?: string;
  image: string;
  restaurant_name: string;
  branch_area: string;
  best_price: number;
  saved_at: string;
}

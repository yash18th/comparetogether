export type ProviderStatusType =
  | 'available'
  | 'not_configured'
  | 'authentication_required'
  | 'unavailable'
  | 'error';

export interface ProviderStatus {
  configured: boolean;
  authenticated: boolean;
  status: ProviderStatusType;
  message?: string;
}

export interface FoodSearchParams {
  query: string;
  location: {
    name: string;
    city?: string;
    area?: string;
    latitude?: number;
    longitude?: number;
    pincode?: string;
  };
  userId?: string;
  filters?: {
    category?: string;
    diet?: string;
    platform?: string;
    priceRange?: string;
  };
  sort?: string;
}

/**
 * Common Provider Adapter Interface
 * All food-ordering providers implement this contract.
 */
export interface Provider {
  readonly name: string;
  readonly code: string;

  getStatus(userId?: string): Promise<ProviderStatus> | ProviderStatus;
  searchFood(params: FoodSearchParams): Promise<any[]>;
  getRestaurant(restaurantId: string, location?: any, userId?: string): Promise<any>;
  getMenu(restaurantId: string, location?: any, userId?: string): Promise<any[]>;
  getItemDetails(itemId: string, restaurantId?: string, userId?: string): Promise<any>;
}

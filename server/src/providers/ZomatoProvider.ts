import { Provider, ProviderStatus, FoodSearchParams } from './Provider.js';

export class ZomatoProvider implements Provider {
  public readonly name = 'Zomato';
  public readonly code = 'zomato';

  private apiKey?: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ZOMATO_API_KEY;
    this.baseUrl = process.env.ZOMATO_BASE_URL || 'https://api.zomato.com/v2';
  }

  public getStatus(): ProviderStatus {
    const isConfigured = Boolean(this.apiKey && this.apiKey.trim().length > 0);

    if (!isConfigured) {
      return {
        configured: false,
        authenticated: false,
        status: 'not_configured',
        message: 'Authorized Zomato API credentials not configured (ZOMATO_API_KEY is not set)'
      };
    }

    return {
      configured: true,
      authenticated: true,
      status: 'available',
      message: 'Configured with authorized Zomato API key'
    };
  }

  /**
   * Search food using authorized Zomato developer API
   * Strictly adheres to authorized endpoints - never scrapes HTML or hidden endpoints.
   */
  public async searchFood(params: FoodSearchParams): Promise<any[]> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      // Not configured - return empty rather than fabricating fake data
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const queryParams = new URLSearchParams({
        q: params.query,
        count: '10'
      });

      if (params.location.latitude && params.location.longitude) {
        queryParams.append('lat', String(params.location.latitude));
        queryParams.append('lon', String(params.location.longitude));
      } else if (params.location.name) {
        queryParams.append('entity_type', 'subzone');
        queryParams.append('q', `${params.query} ${params.location.name}`);
      }

      const response = await fetch(`${this.baseUrl}/search?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'user-key': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Zomato-API-Key': this.apiKey
        },
        signal: controller.signal
      });

      if (!response.ok) {
        console.warn(`Zomato API response status ${response.status}`);
        return [];
      }

      const data = await response.json();
      const restaurants = data.restaurants || [];
      const results: any[] = [];

      for (const entry of restaurants) {
        const r = entry.restaurant || entry;
        results.push({
          provider: 'zomato',
          rawRestaurant: {
            id: String(r.id),
            name: r.name,
            location: r.location?.locality || r.location?.address || params.location.name,
            latitude: Number(r.location?.latitude || 0),
            longitude: Number(r.location?.longitude || 0),
            rating: Number(r.user_rating?.aggregate_rating || 0)
          },
          rawItem: {
            id: `zom_${r.id}_${encodeURIComponent(params.query)}`,
            name: params.query,
            price: Number(r.average_cost_for_two ? Math.round(r.average_cost_for_two / 2) : 0),
            currency: r.currency || 'INR',
            url: r.url
          }
        });
      }

      return results;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Zomato search request timed out after 12s');
      } else {
        console.warn('Zomato search error:', err.message);
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  public async getRestaurant(restaurantId: string, location?: any): Promise<any> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${this.baseUrl}/restaurant?res_id=${encodeURIComponent(restaurantId)}`, {
        headers: {
          'user-key': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  public async getMenu(restaurantId: string, location?: any): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(`${this.baseUrl}/dailymenu?res_id=${encodeURIComponent(restaurantId)}`, {
        headers: {
          'user-key': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.daily_menus || [];
    } catch {
      return [];
    }
  }

  public async getItemDetails(itemId: string, restaurantId?: string): Promise<any> {
    return null;
  }
}

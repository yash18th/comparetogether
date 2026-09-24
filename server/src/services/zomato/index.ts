import { NormalizedFoodItem, FoodItemNormalizer } from '../normalization/FoodItemNormalizer.js';

export interface ZomatoServiceStatus {
  configured: boolean;
  status: 'available' | 'not_configured' | 'error';
  message?: string;
}

export class ZomatoService {
  private static instance: ZomatoService;
  private apiKey?: string;
  private baseUrl: string;

  private constructor() {
    this.apiKey = process.env.ZOMATO_API_KEY;
    this.baseUrl = process.env.ZOMATO_BASE_URL || 'https://api.zomato.com/v2';
  }

  public static getInstance(): ZomatoService {
    if (!ZomatoService.instance) {
      ZomatoService.instance = new ZomatoService();
    }
    return ZomatoService.instance;
  }

  /**
   * Refreshes credentials from environment variables
   */
  public refreshConfig() {
    this.apiKey = process.env.ZOMATO_API_KEY;
    this.baseUrl = process.env.ZOMATO_BASE_URL || 'https://api.zomato.com/v2';
  }

  /**
   * Returns live service status.
   * If credentials are missing, returns 'not_configured'. Never claims fake readiness.
   */
  public getStatus(): ZomatoServiceStatus {
    this.refreshConfig();
    const hasKey = Boolean(this.apiKey && this.apiKey.trim().length > 0);

    if (!hasKey) {
      return {
        configured: false,
        status: 'not_configured',
        message: 'Zomato API credentials not configured (ZOMATO_API_KEY is missing)'
      };
    }

    return {
      configured: true,
      status: 'available',
      message: 'Zomato API service configured and ready'
    };
  }

  /**
   * Searches food items on Zomato via official API.
   * Returns empty array if not configured. Never produces fake or mocked data.
   */
  public async searchFood(query: string, location?: string): Promise<NormalizedFoodItem[]> {
    const status = this.getStatus();
    if (!status.configured || !this.apiKey) {
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const queryParams = new URLSearchParams({
        q: query,
        count: '10'
      });

      if (location) {
        queryParams.append('entity_type', 'subzone');
        queryParams.append('q', `${query} ${location}`);
      }

      const response = await fetch(`${this.baseUrl}/search?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'user-key': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        console.warn(`Zomato API request failed with status: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const restaurants = data.restaurants || [];
      const normalizedItems: NormalizedFoodItem[] = [];

      for (const entry of restaurants) {
        const r = entry.restaurant || entry;
        const rawRestaurant = {
          id: String(r.id),
          name: r.name,
          address: r.location?.locality || r.location?.address || location || ''
        };

        const rawItem = {
          id: `zom_${r.id}_${encodeURIComponent(query)}`,
          name: query,
          description: r.cuisines || '',
          price: r.average_cost_for_two ? Math.round(r.average_cost_for_two / 2) : null,
          currency: r.currency || 'INR',
          available: true
        };

        normalizedItems.push(FoodItemNormalizer.normalizeZomatoItem(rawRestaurant, rawItem));
      }

      return normalizedItems;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Zomato search timed out (12s limit)');
      } else {
        console.warn('Zomato search error:', err.message);
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}

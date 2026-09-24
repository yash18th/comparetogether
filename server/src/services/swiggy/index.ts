import { NormalizedFoodItem, FoodItemNormalizer } from '../normalization/FoodItemNormalizer.js';
import { SwiggyMcpClient } from '../SwiggyMcpClient.js';

export interface SwiggyServiceStatus {
  configured: boolean;
  authenticated: boolean;
  status: 'available' | 'not_configured' | 'authentication_required' | 'error';
  message?: string;
}

export class SwiggyService {
  private static instance: SwiggyService;
  private apiKey?: string;
  private mcpClient: SwiggyMcpClient;

  private constructor() {
    this.apiKey = process.env.SWIGGY_API_KEY;
    this.mcpClient = SwiggyMcpClient.getInstance();
  }

  public static getInstance(): SwiggyService {
    if (!SwiggyService.instance) {
      SwiggyService.instance = new SwiggyService();
    }
    return SwiggyService.instance;
  }

  /**
   * Refreshes environment variables
   */
  public refreshConfig() {
    this.apiKey = process.env.SWIGGY_API_KEY;
  }

  /**
   * Returns live service status.
   * If neither SWIGGY_API_KEY nor Swiggy MCP client ID is set, returns 'not_configured'.
   */
  public getStatus(userId: string = 'default_user'): SwiggyServiceStatus {
    this.refreshConfig();

    const hasApiKey = Boolean(this.apiKey && this.apiKey.trim().length > 0);
    const hasClientId = Boolean(
      process.env.SWIGGY_CLIENT_ID &&
      process.env.SWIGGY_CLIENT_ID !== 'your_swiggy_builders_club_client_id' &&
      process.env.SWIGGY_CLIENT_ID.trim().length > 0
    );

    if (!hasApiKey && !hasClientId) {
      return {
        configured: false,
        authenticated: false,
        status: 'not_configured',
        message: 'Swiggy API credentials not configured (SWIGGY_API_KEY is missing)'
      };
    }

    // If configured via API key
    if (hasApiKey) {
      return {
        configured: true,
        authenticated: true,
        status: 'available',
        message: 'Swiggy API service configured with direct API key'
      };
    }

    // Check OAuth 2.1 PKCE status via Swiggy MCP client
    const mcpStatus = this.mcpClient.getStatus(userId);
    if (mcpStatus.connected && mcpStatus.status === 'AUTHORIZED') {
      return {
        configured: true,
        authenticated: true,
        status: 'available',
        message: 'Swiggy Food MCP connected and authorized'
      };
    }

    return {
      configured: true,
      authenticated: false,
      status: 'authentication_required',
      message: 'Swiggy account authorization required'
    };
  }

  /**
   * Searches food items on Swiggy via authorized connection.
   * Returns empty array if not configured or unauthenticated. Never creates fake prices.
   */
  public async searchFood(
    query: string,
    location?: string,
    userId: string = 'default_user'
  ): Promise<NormalizedFoodItem[]> {
    const status = this.getStatus(userId);
    if (!status.configured || !status.authenticated) {
      return [];
    }

    try {
      let address = this.mcpClient.getStatus(userId).address;
      if (!address || !address.id) {
        address = await this.mcpClient.syncPrimaryAddress(userId);
      }

      if (!address || !address.id) {
        console.warn('Swiggy address synchronization required for menu lookup');
        return [];
      }

      const restaurants = await this.mcpClient.searchRestaurants(query, address.id, userId);
      if (!restaurants || restaurants.length === 0) {
        return [];
      }

      const normalizedItems: NormalizedFoodItem[] = [];
      const topRestaurants = restaurants.slice(0, 4);

      for (const r of topRestaurants) {
        try {
          const menuItems = await this.mcpClient.searchMenu(r.restaurantId, query, address.id, userId);
          for (const item of menuItems) {
            normalizedItems.push(
              FoodItemNormalizer.normalizeSwiggyItem(r, item)
            );
          }
        } catch (menuErr) {
          console.warn(`Swiggy menu search error for ${r.name}:`, menuErr);
        }
      }

      return normalizedItems;
    } catch (err: any) {
      console.warn('Swiggy search error:', err.message);
      return [];
    }
  }
}

import { Provider, ProviderStatus, FoodSearchParams } from './Provider.js';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';

export class SwiggyProvider implements Provider {
  public readonly name = 'Swiggy';
  public readonly code = 'swiggy';

  private mcpClient: SwiggyMcpClient;

  constructor() {
    this.mcpClient = SwiggyMcpClient.getInstance();
  }

  public getStatus(userId: string = 'default_user'): ProviderStatus {
    const rawStatus = this.mcpClient.getStatus(userId);
    const hasConfig = Boolean(
      process.env.SWIGGY_CLIENT_ID &&
      process.env.SWIGGY_CLIENT_ID !== 'foodcompare-dev-client' &&
      process.env.SWIGGY_CLIENT_ID.trim().length > 0
    );

    if (rawStatus.connected && rawStatus.status === 'AUTHORIZED') {
      return {
        configured: true,
        authenticated: true,
        status: 'available',
        message: 'Connected to official Swiggy Food MCP'
      };
    }

    if (rawStatus.status === 'EXPIRED') {
      return {
        configured: true,
        authenticated: false,
        status: 'authentication_required',
        message: 'Swiggy OAuth session has expired. Re-authentication required.'
      };
    }

    return {
      configured: hasConfig,
      authenticated: false,
      status: 'authentication_required',
      message: 'Swiggy account authorization required via OAuth 2.1 PKCE'
    };
  }

  /**
   * Searches food items using official Swiggy Food MCP tools
   * Enforces 12-second timeout and address context
   */
  public async searchFood(params: FoodSearchParams): Promise<any[]> {
    const userId = params.userId || 'default_user';
    const status = this.getStatus(userId);

    if (!status.authenticated) {
      // Clean provider unavailability - no fabricated results
      return [];
    }

    // Set timeout to 12s
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Swiggy request timed out (12s limit)')), 12000)
    );

    const searchExecution = async () => {
      // Step 1: Ensure address context via get_addresses
      let address = this.mcpClient.getStatus(userId).address;
      if (!address || !address.id) {
        address = await this.mcpClient.syncPrimaryAddress(userId);
      }

      if (!address || !address.id) {
        throw new Error('A delivery address context from Swiggy is required for live food search');
      }

      // Step 2: Search restaurants matching query
      const restaurants = await this.mcpClient.searchRestaurants(params.query, address.id, userId);
      if (!restaurants || restaurants.length === 0) {
        return [];
      }

      // Step 3: For top matching restaurants, fetch menu items
      const topRestaurants = restaurants.slice(0, 4);
      const results: any[] = [];

      for (const r of topRestaurants) {
        try {
          const menuItems = await this.mcpClient.searchMenu(r.restaurantId, params.query, address.id, userId);
          for (const item of menuItems) {
            results.push({
              provider: 'swiggy',
              rawRestaurant: r,
              rawItem: item
            });
          }
        } catch (menuErr) {
          // Continue to next restaurant if individual menu search fails
          console.warn(`Swiggy menu search warning for ${r.name}:`, menuErr);
        }
      }

      return results;
    };

    return Promise.race([searchExecution(), timeoutPromise]);
  }

  public async getRestaurant(restaurantId: string, location?: any, userId: string = 'default_user'): Promise<any> {
    const address = this.mcpClient.getStatus(userId).address;
    const restaurants = await this.mcpClient.searchRestaurants(restaurantId, address?.id, userId);
    return restaurants.find(r => r.restaurantId === restaurantId) || null;
  }

  public async getMenu(restaurantId: string, location?: any, userId: string = 'default_user'): Promise<any[]> {
    const address = this.mcpClient.getStatus(userId).address;
    return this.mcpClient.getRestaurantMenu(restaurantId, address?.id, userId);
  }

  public async getItemDetails(itemId: string, restaurantId?: string, userId: string = 'default_user'): Promise<any> {
    if (!restaurantId) return null;
    const menu = await this.getMenu(restaurantId, undefined, userId);
    return menu.find(item => item.menuItemId === itemId) || null;
  }
}

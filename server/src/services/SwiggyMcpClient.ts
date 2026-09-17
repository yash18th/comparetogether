import crypto from 'crypto';
import { db } from '../db/database.js';

export interface SwiggyAddress {
  id: string;
  addressLine?: string;
  area?: string;
  city?: string;
  pincode?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface SwiggyRestaurantResult {
  restaurantId: string;
  name: string;
  branchName?: string;
  area?: string;
  city?: string;
  cuisine?: string[];
  rating?: number;
  deliveryTimeMin?: number;
}

export interface SwiggyMenuItemResult {
  menuItemId: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  portionSize?: string;
  variants?: any[];
  addons?: any[];
  isAvailable: boolean;
}

export interface SwiggyConnectionStatus {
  connected: boolean;
  status: 'LIVE' | 'AUTHORIZED' | 'INTEGRATION_PENDING' | 'EXPIRED' | 'UNAVAILABLE';
  address: SwiggyAddress | null;
  expiresAt: string | null;
  lastUpdated: string | null;
  requiresConfig?: boolean;
}

export class SwiggyMcpClient {
  private static instance: SwiggyMcpClient;

  private baseUrl: string;
  private foodEndpoint: string;
  private callbackUrl: string;
  private clientId: string;
  private clientSecret?: string;

  private constructor() {
    this.baseUrl = process.env.SWIGGY_MCP_BASE_URL || 'https://mcp.swiggy.com';
    this.foodEndpoint = process.env.SWIGGY_MCP_FOOD_ENDPOINT || `${this.baseUrl}/food`;
    this.callbackUrl = process.env.SWIGGY_OAUTH_CALLBACK_URL || 'http://localhost:3001/api/integrations/swiggy/callback';
    this.clientId = process.env.SWIGGY_CLIENT_ID || 'foodcompare-dev-client';
    this.clientSecret = process.env.SWIGGY_CLIENT_SECRET;
  }

  public static getInstance(): SwiggyMcpClient {
    if (!SwiggyMcpClient.instance) {
      SwiggyMcpClient.instance = new SwiggyMcpClient();
    }
    return SwiggyMcpClient.instance;
  }

  /**
   * Generates a cryptographically random PKCE code_verifier and code_challenge (S256)
   */
  public generatePkce(): { codeVerifier: string; codeChallenge: string } {
    // 32 random bytes -> 43 base64url characters
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generates an authorization URL for OAuth 2.1 with PKCE for a specific user
   */
  public createAuthorizationUrl(userId: string = 'default_user'): { authUrl: string; state: string } {
    const { codeVerifier, codeChallenge } = this.generatePkce();
    const state = crypto.randomBytes(16).toString('hex');

    // Save pending state and code_verifier to oauth_sessions tied to this user
    db.prepare(`
      INSERT INTO oauth_sessions (user_id, platform_code, code_verifier, state, updated_at)
      VALUES (?, 'swiggy', ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, platform_code) DO UPDATE SET
        code_verifier = excluded.code_verifier,
        state = excluded.state,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, codeVerifier, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'food',
      state
    });

    const authUrl = `${this.baseUrl}/auth/authorize?${params.toString()}`;
    return { authUrl, state };
  }

  /**
   * Handles the OAuth 2.1 callback and exchanges the authorization code for an access token
   */
  public async handleCallback(code: string, state: string, userId: string = 'default_user'): Promise<{ success: boolean; message: string }> {
    if (!code || !state) {
      throw new Error('Authorization code and state are required');
    }

    const session = db.prepare(`
      SELECT code_verifier, state FROM oauth_sessions WHERE user_id = ? AND platform_code = 'swiggy'
    `).get(userId) as any;

    if (!session || !session.code_verifier) {
      throw new Error('No pending PKCE authorization session found for Swiggy');
    }

    if (session.state !== state) {
      throw new Error('OAuth state validation mismatch. Potential CSRF detected.');
    }

    // Exchange authorization code for token
    const tokenUrl = `${this.baseUrl}/auth/token`;
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.callbackUrl,
      client_id: this.clientId,
      code_verifier: session.code_verifier
    });

    if (this.clientSecret) {
      bodyParams.append('client_secret', this.clientSecret);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: bodyParams.toString(),
        signal: controller.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Token exchange failed (HTTP ${response.status}): ${errText}`);
      }

      const tokenData = await response.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || null;
      const expiresIn = tokenData.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Update session with token
      db.prepare(`
        UPDATE oauth_sessions SET
          access_token = ?,
          refresh_token = ?,
          token_type = 'Bearer',
          expires_at = ?,
          code_verifier = NULL,
          state = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND platform_code = 'swiggy'
      `).run(accessToken, refreshToken, expiresAt, userId);

      // Fetch primary address using official get_addresses
      try {
        await this.syncPrimaryAddress(userId);
      } catch (addrErr) {
        console.warn('Initial address sync warning after OAuth:', addrErr);
      }

      return { success: true, message: 'Swiggy MCP authenticated successfully' };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to exchange authorization code for token');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Refreshes an expired access token using the stored refresh token
   */
  public async refreshAccessToken(userId: string = 'default_user'): Promise<string | null> {
    const session = db.prepare(`
      SELECT refresh_token FROM oauth_sessions WHERE user_id = ? AND platform_code = 'swiggy'
    `).get(userId) as any;

    if (!session || !session.refresh_token) {
      return null;
    }

    const tokenUrl = `${this.baseUrl}/auth/token`;
    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refresh_token,
      client_id: this.clientId
    });

    if (this.clientSecret) {
      bodyParams.append('client_secret', this.clientSecret);
    }

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: bodyParams.toString()
      });

      if (!response.ok) return null;

      const tokenData = await response.json();
      const newAccessToken = tokenData.access_token;
      const newRefreshToken = tokenData.refresh_token || session.refresh_token;
      const expiresIn = tokenData.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      db.prepare(`
        UPDATE oauth_sessions SET
          access_token = ?,
          refresh_token = ?,
          expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND platform_code = 'swiggy'
      `).run(newAccessToken, newRefreshToken, expiresAt, userId);

      return newAccessToken;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves active session details (never exposes tokens to client)
   */
  public getStatus(userId: string = 'default_user'): SwiggyConnectionStatus {
    const hasConfig = Boolean(process.env.SWIGGY_CLIENT_ID && process.env.SWIGGY_CLIENT_ID !== 'foodcompare-dev-client');

    const session = db.prepare(`
      SELECT platform_code, access_token, refresh_token, expires_at, address_id, address_details, updated_at
      FROM oauth_sessions
      WHERE user_id = ? AND platform_code = 'swiggy'
    `).get(userId) as any;

    if (!session || !session.access_token) {
      return {
        connected: false,
        status: 'INTEGRATION_PENDING',
        address: null,
        expiresAt: null,
        lastUpdated: null,
        requiresConfig: !hasConfig
      };
    }

    const isExpired = session.expires_at ? new Date(session.expires_at).getTime() < Date.now() : false;
    if (isExpired) {
      return {
        connected: false,
        status: 'EXPIRED',
        address: null,
        expiresAt: session.expires_at,
        lastUpdated: session.updated_at,
        requiresConfig: !hasConfig
      };
    }

    let parsedAddress: SwiggyAddress | null = null;
    if (session.address_details) {
      try {
        parsedAddress = JSON.parse(session.address_details);
      } catch {
        parsedAddress = session.address_id ? { id: session.address_id } : null;
      }
    }

    return {
      connected: true,
      status: 'AUTHORIZED',
      address: parsedAddress,
      expiresAt: session.expires_at,
      lastUpdated: session.updated_at,
      requiresConfig: !hasConfig
    };
  }

  /**
   * Disconnects Swiggy session and revokes server-side tokens for the user
   */
  public disconnect(userId: string = 'default_user'): { success: boolean } {
    db.prepare(`
      DELETE FROM oauth_sessions WHERE user_id = ? AND platform_code = 'swiggy'
    `).run(userId);
    return { success: true };
  }

  /**
   * Executes an MCP JSON-RPC tool call against Swiggy Food MCP
   */
  public async callMcpTool<T = any>(toolName: string, args: Record<string, any> = {}, userId: string = 'default_user'): Promise<T> {
    const session = db.prepare(`
      SELECT access_token, expires_at FROM oauth_sessions WHERE user_id = ? AND platform_code = 'swiggy'
    `).get(userId) as any;

    if (!session || !session.access_token) {
      throw new Error('Swiggy MCP is not authenticated. Integration pending.');
    }

    let token = session.access_token;

    // Check expiration and try refresh
    if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
      const refreshed = await this.refreshAccessToken(userId);
      if (!refreshed) {
        throw new Error('Swiggy MCP authorization token has expired. Please re-authenticate.');
      }
      token = refreshed;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    try {
      const response = await fetch(this.foodEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Swiggy MCP error (HTTP ${response.status}): ${errorText}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(`Swiggy MCP tool error: ${json.error.message || JSON.stringify(json.error)}`);
      }

      return (json.result && json.result.content) ? json.result.content : json.result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Swiggy MCP request timed out (10s limit).');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Official Food MCP Tool: get_addresses
   * Mandatory Step 1: retrieves real delivery addresses returned by Swiggy.
   * Stores the most recent valid addressId. NEVER invents an addressId.
   */
  public async syncPrimaryAddress(userId: string = 'default_user'): Promise<SwiggyAddress | null> {
    try {
      const addresses = await this.callMcpTool<any[]>('get_addresses', {}, userId);
      if (Array.isArray(addresses) && addresses.length > 0) {
        const primary = addresses[0];
        const addressObj: SwiggyAddress = {
          id: primary.id || primary.address_id || primary.addressId,
          addressLine: primary.addressLine || primary.address_line || primary.line1,
          area: primary.area || primary.locality,
          city: primary.city,
          pincode: primary.pincode,
          formattedAddress: primary.formattedAddress || primary.formatted_address || `${primary.area || ''}, ${primary.city || ''}`.trim(),
          latitude: primary.lat || primary.latitude,
          longitude: primary.lng || primary.longitude
        };

        db.prepare(`
          UPDATE oauth_sessions SET
            address_id = ?,
            address_details = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND platform_code = 'swiggy'
        `).run(addressObj.id, JSON.stringify(addressObj), userId);

        return addressObj;
      }
      return null;
    } catch (err) {
      console.warn('Could not sync address from Swiggy get_addresses:', err);
      return null;
    }
  }

  /**
   * Official Food MCP Tool: search_restaurants
   */
  public async searchRestaurants(query: string, addressId?: string, userId: string = 'default_user'): Promise<SwiggyRestaurantResult[]> {
    const status = this.getStatus(userId);
    const effectiveAddressId = addressId || status.address?.id;

    if (!effectiveAddressId) {
      throw new Error('A valid delivery addressId from Swiggy is required before searching restaurants');
    }

    const raw = await this.callMcpTool('search_restaurants', {
      addressId: effectiveAddressId,
      query
    }, userId);

    if (!Array.isArray(raw)) return [];

    return raw.map((r: any) => ({
      restaurantId: String(r.id || r.restaurant_id || r.restaurantId),
      name: r.name,
      branchName: r.locality || r.area || '',
      area: r.area || r.locality || '',
      city: r.city || '',
      cuisine: Array.isArray(r.cuisines) ? r.cuisines : (r.cuisine ? [r.cuisine] : []),
      rating: Number(r.avgRating || r.rating || 0),
      deliveryTimeMin: Number(r.sla?.deliveryTime || r.delivery_time || 30)
    }));
  }

  /**
   * Official Food MCP Tool: search_menu
   */
  public async searchMenu(restaurantId: string, query: string, addressId?: string, userId: string = 'default_user'): Promise<SwiggyMenuItemResult[]> {
    const status = this.getStatus(userId);
    const effectiveAddressId = addressId || status.address?.id;

    if (!effectiveAddressId) {
      throw new Error('A valid delivery addressId from Swiggy is required before searching menus');
    }

    const raw = await this.callMcpTool('search_menu', {
      addressId: effectiveAddressId,
      restaurantId,
      query
    }, userId);

    if (!Array.isArray(raw)) return [];

    return raw.map((item: any) => ({
      menuItemId: String(item.id || item.menu_item_id || item.itemId),
      restaurantId,
      name: item.name,
      description: item.description,
      price: (item.price || item.finalPrice || 0) / 100,
      isVeg: Boolean(item.isVeg || item.vegetarian),
      portionSize: item.portionSize || item.portion_size,
      variants: item.variants || [],
      addons: item.addons || [],
      isAvailable: item.inStock !== false && item.isAvailable !== false
    }));
  }

  /**
   * Official Food MCP Tool: get_restaurant_menu
   */
  public async getRestaurantMenu(restaurantId: string, addressId?: string, userId: string = 'default_user'): Promise<SwiggyMenuItemResult[]> {
    const status = this.getStatus(userId);
    const effectiveAddressId = addressId || status.address?.id;

    if (!effectiveAddressId) {
      throw new Error('A valid delivery addressId from Swiggy is required to retrieve restaurant menus');
    }

    const raw = await this.callMcpTool('get_restaurant_menu', {
      addressId: effectiveAddressId,
      restaurantId
    }, userId);

    if (!Array.isArray(raw)) return [];

    return raw.map((item: any) => ({
      menuItemId: String(item.id || item.menu_item_id || item.itemId),
      restaurantId,
      name: item.name,
      description: item.description,
      price: typeof item.price === 'number' && item.price > 1000 ? item.price / 100 : Number(item.price || 0),
      isVeg: Boolean(item.isVeg || item.vegetarian),
      portionSize: item.portionSize,
      variants: item.variants || [],
      addons: item.addons || [],
      isAvailable: item.inStock !== false && item.isAvailable !== false
    }));
  }
}

import type { SearchProductItem, ComparisonData, User, PriceAlert, FavoriteItem, Platform } from '../types';

export function getApiBaseUrl(): string {
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    // In production on Vercel, use same-origin /api path (proxied by vercel.json)
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3001/api';
}

/**
 * Robust fetch wrapper with automatic timeout, error categorization, and abort handling
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Comparison request timed out. The server took too long to respond.');
    }
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error('Unable to reach FoodCompare server. Please verify your connection.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getAuthHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem('fc_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

const API_BASE = getApiBaseUrl();

export const api = {
  getBaseUrl: () => getApiBaseUrl(),
  // Service health check
  checkHealth: async (): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);
      if (res.ok) {
        return { ok: true };
      }
      return { ok: false, message: `Server responded with status ${res.status}` };
    } catch (err: any) {
      return {
        ok: false,
        message: err.name === 'AbortError' ? 'Health check timed out' : 'Comparison backend unreachable'
      };
    }
  },

  // Search using standardized contract POST /api/compare/search (fallback to GET /api/search)
  search: async (params: {
    q?: string;
    city?: string;
    area?: string;
    pincode?: string;
    cuisine?: string;
    category?: string;
    vegetarian?: boolean;
    minPrice?: number;
    maxPrice?: number;
    platform?: string;
    sortBy?: string;
    membership?: boolean;
  }): Promise<SearchProductItem[]> => {
    const payload = {
      query: (params.q || '').trim(),
      category: params.category && params.category !== 'All' ? params.category : null,
      location: {
        name: params.area || '',
        city: params.city || 'Bangalore',
        pincode: params.pincode || ''
      },
      platforms: params.platform ? [params.platform] : ['swiggy', 'zomato', 'eatclub', 'direct'],
      vegOnly: params.vegetarian === true,
      nonVegOnly: params.vegetarian === false,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sortBy: params.sortBy,
      membership: Boolean(params.membership)
    };

    // Try POST /api/compare/search first
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/compare/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(payload)
        },
        10000
      );

      if (res.ok) {
        const data = await res.json();
        return data.data || data.results || [];
      }
      // If 404/405, fallback to GET /api/search
      if (res.status === 404 || res.status === 405) {
        throw new Error('FALLBACK_GET');
      }
      if (res.status === 500) {
        throw new Error('FoodCompare server encountered an unexpected error. Please try again.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Search request failed with status ${res.status}`);
    } catch (err: any) {
      if (err?.message !== 'FALLBACK_GET' && err?.name !== 'TypeError') {
        throw err;
      }
      // Fallback: GET /api/search with query parameters
      const query = new URLSearchParams();
      if (payload.query) query.append('q', payload.query);
      if (params.city) query.append('city', params.city);
      if (params.area) query.append('area', params.area);
      if (params.pincode) query.append('pincode', params.pincode);
      if (params.cuisine) query.append('cuisine', params.cuisine);
      if (payload.category) query.append('category', payload.category);
      if (params.vegetarian !== undefined) query.append('vegetarian', String(params.vegetarian));
      if (params.minPrice !== undefined) query.append('minPrice', String(params.minPrice));
      if (params.maxPrice !== undefined) query.append('maxPrice', String(params.maxPrice));
      if (params.platform) query.append('platform', params.platform);
      if (params.sortBy) query.append('sortBy', params.sortBy);
      if (params.membership) query.append('membership', 'true');

      const res = await fetchWithTimeout(`${API_BASE}/search?${query.toString()}`, {}, 10000);
      if (!res.ok) {
        if (res.status === 500) {
          throw new Error('FoodCompare server encountered an unexpected error. Please try again.');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Search request failed with status ${res.status}`);
      }
      const data = await res.json();
      return data.data || data.results || [];
    }
  },

  // Compare
  getComparison: async (productId: string, membership = false): Promise<ComparisonData> => {
    const res = await fetchWithTimeout(`${API_BASE}/compare/${productId}?membership=${membership}`, {}, 10000);
    if (!res.ok) {
      throw new Error(`Comparison API returned HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error(data.message || 'Comparison data unavailable for this item');
    }
    return data.data;
  },

  // Locations
  getLocations: async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/locations`, {}, 6000);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },

  detectLocation: async (lat?: number, lng?: number) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/locations/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      }, 6000);
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  },

  // Auth
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }, 8000);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login failed');
    return data;
  },

  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    }, 8000);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Registration failed');
    return data;
  },

  demoGoogleLogin: async (): Promise<{ token: string; user: User }> => {
    const res = await fetchWithTimeout(`${API_BASE}/auth/demo-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, 8000);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Google login failed');
    return data;
  },

  getCurrentUser: async (): Promise<User | null> => {
    const token = localStorage.getItem('fc_token');
    if (!token) return null;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/me`, {
        headers: getAuthHeader()
      }, 6000);
      const data = await res.json();
      return data.success ? data.user : null;
    } catch {
      return null;
    }
  },

  // User Dashboard APIs
  getFavorites: async (): Promise<FavoriteItem[]> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/user/favorites`, { headers: getAuthHeader() }, 6000);
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },

  toggleFavorite: async (productId: string): Promise<{ isFavorite: boolean }> => {
    const res = await fetchWithTimeout(`${API_BASE}/user/favorites/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ productId })
    }, 8000);
    const data = await res.json();
    return data;
  },

  getAlerts: async (): Promise<PriceAlert[]> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/user/alerts`, { headers: getAuthHeader() }, 6000);
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },

  createAlert: async (productId: string, targetPrice: number) => {
    const res = await fetchWithTimeout(`${API_BASE}/user/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ productId, targetPrice })
    }, 8000);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  deleteAlert: async (alertId: string) => {
    const res = await fetchWithTimeout(`${API_BASE}/user/alerts/${alertId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    }, 8000);
    return res.json();
  },

  getSearchHistory: async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/user/history`, {}, 6000);
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },

  // Admin APIs
  getAdminMetrics: async () => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/metrics`, {}, 8000);
    const data = await res.json();
    return data.data;
  },

  getAdminRestaurants: async () => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/restaurants`, {}, 8000);
    const data = await res.json();
    return data.data;
  },

  createRestaurant: async (restaurant: any) => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restaurant)
    }, 8000);
    return res.json();
  },

  createBranch: async (branch: any) => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch)
    }, 8000);
    return res.json();
  },

  getAdminProducts: async () => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/products`, {}, 8000);
    const data = await res.json();
    return data.data || [];
  },

  createProduct: async (product: any) => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    }, 8000);
    return res.json();
  },

  toggleProductAvailability: async (id: string, isAvailable: boolean) => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/products/${id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable })
    }, 8000);
    return res.json();
  },

  getAdminMatches: async () => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/matches`, {}, 8000);
    const data = await res.json();
    return data.data || [];
  },

  updateMatchStatus: async (matchId: string, status: string) => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/matches/${matchId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }, 8000);
    return res.json();
  },

  testMatchingAlgorithm: async (data: any) => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/matches/test-algorithm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 8000);
    return res.json();
  },

  getAdminPlatforms: async (): Promise<Platform[]> => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/platforms`, {}, 8000);
    const data = await res.json();
    return data.data || [];
  },

  updatePlatformStatus: async (id: string, status: string) => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/platforms/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }, 8000);
    return res.json();
  },

  getAdminSearches: async () => {
    const res = await fetchWithTimeout(`${API_BASE}/admin/searches`, {}, 8000);
    const data = await res.json();
    return data.data || [];
  },

  // Swiggy Official MCP Integration
  getSwiggyStatus: async (): Promise<any> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/integrations/swiggy/status`, {}, 8000);
      const data = await res.json();
      return data.data || { connected: false, status: 'INTEGRATION_PENDING' };
    } catch {
      return { connected: false, status: 'UNAVAILABLE' };
    }
  },

  disconnectSwiggy: async () => {
    const res = await fetchWithTimeout(`${API_BASE}/integrations/swiggy/disconnect`, {
      method: 'POST'
    }, 8000);
    return res.json();
  },

  getSwiggyConnectUrl: async (): Promise<string> => {
    const res = await fetchWithTimeout(`${API_BASE}/integrations/swiggy/connect?format=json`, {}, 8000);
    const data = await res.json();
    return data.authUrl;
  }
};

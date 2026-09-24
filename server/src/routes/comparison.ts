import { Router } from 'express';
import { SearchService } from '../services/SearchService.js';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';
import { SearchEngine } from '../engine/SearchEngine.js';
import { NormalizationEngine } from '../engine/NormalizationEngine.js';
import { NormalizedPlatformProduct } from '../adapters/PlatformAdapter.js';
import { db } from '../db/database.js';
import { FoodComparisonService } from '../services/comparison/FoodComparisonService.js';

const router = Router();

/**
 * GET /api/providers/status
 * Returns live health and authentication status of all external providers
 */
router.get('/status', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'default_user';
    const registry = ProviderRegistry.getInstance();
    const statuses = await registry.getStatuses(userId);

    res.json({
      success: true,
      swiggy: statuses.swiggy || {
        configured: false,
        authenticated: false,
        status: 'not_configured'
      },
      zomato: statuses.zomato || {
        configured: false,
        authenticated: false,
        status: 'not_configured'
      },
      providers: statuses,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching provider status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve provider statuses',
      error: error.message
    });
  }
});

/**
 * POST /api/providers/test/swiggy
 * Tests live connection to Swiggy Food MCP
 */
router.post('/test/swiggy', async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = (req.body?.userId as string) || (req.headers['x-user-id'] as string) || 'default_user';
    const provider = ProviderRegistry.getInstance().getProvider('swiggy');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Swiggy provider not registered' });
    }

    const status = await provider.getStatus(userId);
    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      provider: 'swiggy',
      status: status.status,
      authenticated: status.authenticated,
      configured: status.configured,
      latencyMs,
      message: status.message,
      testedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      provider: 'swiggy',
      error: err.message,
      latencyMs: Date.now() - startTime
    });
  }
});

/**
 * POST /api/providers/test/zomato
 * Tests authorized Zomato developer API integration
 */
router.post('/test/zomato', async (req, res) => {
  const startTime = Date.now();
  try {
    const provider = ProviderRegistry.getInstance().getProvider('zomato');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Zomato provider not registered' });
    }

    const status = await provider.getStatus();
    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      provider: 'zomato',
      status: status.status,
      authenticated: status.authenticated,
      configured: status.configured,
      latencyMs,
      message: status.message,
      testedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      provider: 'zomato',
      error: err.message,
      latencyMs: Date.now() - startTime
    });
  }
});

/**
 * POST /api/providers/test/compare
 * Runs an end-to-end multi-provider comparison test
 */
router.post('/test/compare', async (req, res) => {
  const startTime = Date.now();
  try {
    const query = req.body?.query || 'Masala Dosa';
    const location = req.body?.location || 'Indiranagar';

    const testResult = await SearchService.search({
      query,
      location: { name: location },
      userId: 'test_user'
    });

    res.json({
      success: true,
      query,
      location,
      providers: testResult.providers,
      totalMatches: testResult.totalMatches,
      latencyMs: Date.now() - startTime,
      sampleResult: testResult.results.length > 0 ? testResult.results[0] : null,
      testedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      latencyMs: Date.now() - startTime
    });
  }
});

/**
 * Unified comparison handler for POST /api/compare and POST /api/compare/search
 */
const handleCompare = async (req: any, res: any) => {
  try {
    const body = req.body || {};
    const query = (body.query || body.q || '').toString().trim();
    const userId = body.userId || (req.headers['x-user-id'] as string) || 'default_user';

    let locationName = 'Indiranagar';
    let city = 'Bangalore';
    let pincode = '';

    if (typeof body.location === 'string') {
      locationName = body.location.trim();
    } else if (body.location && typeof body.location === 'object') {
      locationName = (body.location.name || body.location.area || 'Indiranagar').toString().trim();
      city = (body.location.city || 'Bangalore').toString().trim();
      pincode = (body.location.pincode || '').toString().trim();
    } else if (body.area) {
      locationName = body.area.toString().trim();
    }

    // Record search history if user query is present
    if (query && query.length > 1) {
      try {
        const histId = `sh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.prepare(`
          INSERT INTO search_history (id, user_id, query, location, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(histId, userId !== 'default_user' ? userId : null, query, locationName ? `${locationName}, ${city}` : city);
      } catch {
        // Silently ignore history insert errors
      }
    }

    // Run modular SearchService pipeline
    const comparisonResponse = await SearchService.search({
      query,
      location: {
        name: locationName,
        city,
        pincode
      },
      userId,
      filters: body.filters || {
        category: body.category,
        diet: body.vegOnly ? 'veg' : body.nonVegOnly ? 'non_veg' : body.diet,
        platform: body.platform,
        priceRange: body.priceRange
      },
      sort: body.sort || body.sortBy
    });

    // Also run existing SearchEngine to supply backward-compatible `data` array for legacy cards
    let legacyResults: any[] = [];
    try {
      legacyResults = SearchEngine.search({
        query,
        category: body.category && body.category !== 'All' ? body.category : undefined,
        city,
        area: locationName,
        pincode,
        vegetarian: body.vegOnly ? true : body.nonVegOnly ? false : undefined,
        minPrice: body.minPrice ? Number(body.minPrice) : undefined,
        maxPrice: body.maxPrice ? Number(body.maxPrice) : undefined,
        platform: body.platform,
        sortBy: body.sortBy as any,
        hasMembership: Boolean(body.membership),
        userId
      });
    } catch (legacyErr) {
      console.warn('Legacy search fallback notice:', legacyErr);
    }

    res.json({
      success: true,
      query,
      location: locationName,
      providers: comparisonResponse.providers,
      results: comparisonResponse.results,
      data: legacyResults.length > 0 ? legacyResults : comparisonResponse.results,
      count: comparisonResponse.totalMatches,
      totalMatches: comparisonResponse.totalMatches,
      durationMs: comparisonResponse.durationMs,
      requestId: comparisonResponse.requestId,
      fetchedAt: comparisonResponse.fetchedAt
    });
  } catch (error: any) {
    console.error('Compare error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Comparison service encountered an unexpected error',
      error: error.message
    });
  }
};

/**
 * GET /api/compare?item=Masala%20Dosa
 * Direct food item comparison endpoint matching the same dish across Zomato and Swiggy
 */
router.get('/', async (req, res) => {
  try {
    const itemQuery = (req.query.item || req.query.query || req.query.q || '').toString().trim();
    if (!itemQuery) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameter: item (e.g., /api/compare?item=Masala%20Dosa)'
      });
    }

    const location = (req.query.location || req.query.area || 'Indiranagar').toString().trim();
    const userId = (req.query.userId || req.headers['x-user-id'] || 'default_user').toString().trim();

    const comparisonResult = await FoodComparisonService.compareFoodItem(itemQuery, location, userId);

    res.json({
      success: true,
      ...comparisonResult
    });
  } catch (error: any) {
    console.error('GET /api/compare error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare food item',
      error: error.message
    });
  }
});

router.post('/', handleCompare);
router.post('/search', handleCompare);

/**
 * GET /api/compare/:productId
 * Fetches single product multi-platform breakdown
 */
router.get('/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const { membership, userId: queryUserId } = req.query;
    const hasMembership = membership === 'true';
    const userId = (queryUserId as string) || (req.headers['x-user-id'] as string) || 'default_user';

    const product = db.prepare(`
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.category,
        p.cuisine,
        p.vegetarian,
        p.vegan,
        p.portion_size,
        p.portion_unit,
        p.image,
        b.id AS branch_id,
        b.name AS branch_name,
        b.address AS branch_address,
        b.city AS branch_city,
        b.area AS branch_area,
        b.pincode AS branch_pincode,
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        r.logo AS restaurant_logo,
        r.rating AS restaurant_rating,
        r.description AS restaurant_description
      FROM products p
      JOIN branches b ON p.restaurant_branch_id = b.id
      JOIN restaurants r ON b.restaurant_id = r.id
      WHERE p.id = ?
    `).get(productId) as any;

    if (!product) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    const swiggyStatus = SwiggyMcpClient.getInstance().getStatus(userId);
    const isSwiggyConnected = swiggyStatus.connected && swiggyStatus.status === 'AUTHORIZED';
    const isZomatoAuthorized = Boolean(process.env.ZOMATO_API_KEY && process.env.ZOMATO_API_KEY.trim().length > 0);

    const prices = (db.prepare(`
      SELECT 
        pp.*,
        plat.name AS platform_name,
        plat.code AS platform_code,
        plat.logo_url AS platform_logo,
        plat.integration_status,
        plat.is_official
      FROM product_prices pp
      JOIN platforms plat ON pp.platform_id = plat.id
      WHERE pp.product_id = ?
    `).all(productId) as any[]).map(p => {
      let finalPrice: number | null = p.final_price;
      let membershipApplied = false;
      let activeMembershipDiscount = 0;

      const isSwiggy = p.platform_code === 'swiggy';
      const isZomato = p.platform_code === 'zomato';

      let dataProvenance: 'LIVE' | 'AUTHORIZED' | 'MOCK' | 'UNAVAILABLE' | 'INTEGRATION_PENDING' = 'AUTHORIZED';
      let status: 'AVAILABLE' | 'AUTH_REQUIRED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'TIMEOUT' = 'AVAILABLE';
      let finalPriceUnavailable = false;
      let unavailabilityReason: string | undefined = undefined;

      if (isSwiggy) {
        if (!isSwiggyConnected) {
          dataProvenance = 'INTEGRATION_PENDING';
          status = 'AUTH_REQUIRED';
          finalPriceUnavailable = true;
          finalPrice = null;
          unavailabilityReason = 'Swiggy authorization is required';
        } else {
          dataProvenance = 'LIVE';
          status = 'AVAILABLE';
          finalPriceUnavailable = false;
        }
      } else if (isZomato) {
        if (!isZomatoAuthorized) {
          dataProvenance = 'INTEGRATION_PENDING';
          status = 'NOT_CONFIGURED';
          finalPriceUnavailable = true;
          finalPrice = null;
          unavailabilityReason = 'Authorized Zomato API access is not configured';
        } else {
          dataProvenance = 'AUTHORIZED';
          status = 'AVAILABLE';
          finalPriceUnavailable = false;
        }
      } else {
        status = p.availability ? 'AVAILABLE' : 'UNAVAILABLE';
      }

      if (hasMembership && !finalPriceUnavailable && finalPrice !== null) {
        if (isSwiggy && isSwiggyConnected) {
          activeMembershipDiscount = Math.round(p.item_price * 0.10) + p.delivery_fee;
          finalPrice = Math.max(0, finalPrice - activeMembershipDiscount);
          membershipApplied = true;
        } else if (isZomato && isZomatoAuthorized) {
          activeMembershipDiscount = Math.round(p.item_price * 0.10) + p.delivery_fee;
          finalPrice = Math.max(0, finalPrice - activeMembershipDiscount);
          membershipApplied = true;
        } else if (p.platform_code === 'eatclub') {
          activeMembershipDiscount = p.membership_discount || 0;
          finalPrice = Math.max(0, finalPrice - activeMembershipDiscount);
          membershipApplied = true;
        }
      }

      const updatedDate = new Date(p.updated_at);
      const minutesAgo = Math.max(1, Math.round((Date.now() - updatedDate.getTime()) / 60000));

      return {
        ...p,
        addons: 0,
        status,
        status_message: unavailabilityReason,
        item_price: finalPriceUnavailable ? null : p.item_price,
        delivery_fee: finalPriceUnavailable ? null : p.delivery_fee,
        platform_fee: finalPriceUnavailable ? null : p.platform_fee,
        packaging_fee: finalPriceUnavailable ? null : p.packaging_fee,
        taxes: finalPriceUnavailable ? null : p.taxes,
        final_price: finalPrice,
        final_price_unavailable: finalPriceUnavailable,
        unavailability_reason: unavailabilityReason,
        data_provenance: dataProvenance,
        membership_applied: membershipApplied,
        active_membership_discount: activeMembershipDiscount,
        last_updated_human: `${minutesAgo} minutes ago`
      };
    });

    const normalizedProducts: NormalizedPlatformProduct[] = prices.map(p => ({
      platform: p.platform_name,
      platformId: p.platform_id,
      platformCode: p.platform_code,
      restaurantId: product.restaurant_id,
      restaurantName: product.restaurant_name,
      branchId: product.branch_id,
      branchName: product.branch_name,
      address: `${product.branch_address}, ${product.branch_city}`,
      menuItemId: p.product_id,
      itemName: product.product_name,
      description: product.product_description,
      category: product.category,
      image: product.image,
      portion: product.portion_size ? { size: product.portion_size, unit: product.portion_unit } : undefined,
      variants: [],
      addons: [],
      availability: Boolean(p.availability),
      itemPrice: p.item_price,
      addonTotal: 0,
      deliveryFee: p.delivery_fee,
      platformFee: p.platform_fee,
      packagingFee: p.packaging_fee,
      taxes: p.taxes,
      discount: p.discount,
      couponDiscount: p.membership_applied ? p.active_membership_discount : 0,
      potentialDiscounts: p.final_price_unavailable ? ['Promotional discounts verified upon live session'] : [],
      subtotal: p.item_price,
      finalPrice: p.final_price,
      currency: p.currency,
      fetchedAt: p.updated_at,
      dataStatus: p.status,
      unavailabilityReason: p.unavailability_reason,
      orderUrl: p.order_url
    }));

    const comparisonSummary = NormalizationEngine.comparePlatforms(
      product.product_id,
      product.product_name,
      product.restaurant_name,
      product.branch_name,
      product.branch_area,
      product.portion_size,
      product.portion_unit,
      prices.map(p => ({
        platformId: p.platform_id,
        platformName: p.platform_name,
        platformCode: p.platform_code,
        itemPrice: p.item_price,
        addons: 0,
        deliveryFee: p.delivery_fee,
        platformFee: p.platform_fee,
        packagingFee: p.packaging_fee,
        taxes: p.taxes,
        discount: p.discount,
        finalPrice: p.final_price,
        finalPriceUnavailable: p.final_price_unavailable,
        unavailabilityReason: p.unavailability_reason,
        membershipDiscount: p.membership_discount,
        membershipApplied: p.membership_applied,
        membershipPlanName: p.membership_type,
        estimatedDeliveryMin: 28,
        currency: p.currency,
        orderUrl: p.order_url,
        availability: Boolean(p.availability),
        sourceType: 'authorized_api',
        dataProvenance: p.data_provenance,
        lastUpdated: p.updated_at
      })),
      normalizedProducts
    );

    const historyRows = db.prepare(`
      SELECT 
        ph.*,
        plat.code AS platform_code,
        plat.name AS platform_name
      FROM price_history ph
      JOIN platforms plat ON ph.platform_id = plat.id
      WHERE ph.product_id = ?
      ORDER BY ph.recorded_at ASC
    `).all(productId) as any[];

    const avg30Day = historyRows.length > 0
      ? Math.round(historyRows.reduce((acc, h) => acc + h.price, 0) / historyRows.length)
      : (comparisonSummary.cheapestFinalPrice || 0);

    const matches = db.prepare(`
      SELECT 
        pm.*,
        plat.name AS platform_name,
        plat.code AS platform_code
      FROM product_matches pm
      JOIN platforms plat ON pm.platform_id = plat.id
      WHERE pm.product_id = ?
    `).all(productId);

    const otherBranches = db.prepare(`
      SELECT 
        b.id AS branch_id,
        b.name AS branch_name,
        b.area,
        b.pincode,
        b.city
      FROM branches b
      WHERE b.restaurant_id = ? AND b.id != ? AND b.is_active = 1
    `).all(product.restaurant_id, product.branch_id);

    res.json({
      success: true,
      data: {
        product,
        prices,
        normalizedProducts,
        comparison: comparisonSummary,
        priceHistory: historyRows,
        averagePrice30d: avg30Day,
        matches,
        otherBranches
      }
    });
  } catch (error: any) {
    console.error('Comparison error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error loading comparison' });
  }
});

export default router;

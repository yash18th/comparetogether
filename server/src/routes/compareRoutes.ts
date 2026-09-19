import { Router } from 'express';
import { db } from '../db/database.js';
import { NormalizationEngine } from '../engine/NormalizationEngine.js';
import { SearchEngine } from '../engine/SearchEngine.js';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';
import { NormalizedPlatformProduct } from '../adapters/PlatformAdapter.js';
import { ComparisonService } from '../services/ComparisonService.js';

const router = Router();

// Get complete comparison details for a specific product
router.get('/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const { membership, userId: queryUserId } = req.query;
    const hasMembership = membership === 'true';
    const userId = (queryUserId as string) || (req.headers['x-user-id'] as string) || 'default_user';

    // 1. Fetch product, branch, restaurant details
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

    // 2. Check Swiggy connection status for this user
    const swiggyStatus = SwiggyMcpClient.getInstance().getStatus(userId);
    const isSwiggyConnected = swiggyStatus.connected && swiggyStatus.status === 'AUTHORIZED';

    // Check Zomato API status
    const isZomatoAuthorized = Boolean(process.env.ZOMATO_API_KEY && process.env.ZOMATO_API_KEY.trim().length > 0);

    // 3. Fetch platform prices
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

      // Membership discounts only apply if authorized platform connection establishes it
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

      // Compute last updated minutes
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

    // Build standardized NormalizedPlatformProduct list
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

    // 4. Normalized aggregation and portion metrics
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

    // 5. Fetch price history
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

    // Calculate 30-day average
    const avg30Day = historyRows.length > 0
      ? Math.round(historyRows.reduce((acc, h) => acc + h.price, 0) / historyRows.length)
      : (comparisonSummary.cheapestFinalPrice || 0);

    // 6. Product matches (confidence score records)
    const matches = db.prepare(`
      SELECT 
        pm.*,
        plat.name AS platform_name,
        plat.code AS platform_code
      FROM product_matches pm
      JOIN platforms plat ON pm.platform_id = plat.id
      WHERE pm.product_id = ?
    `).all(productId);

    // 7. Other branches for this restaurant
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

// Handler for both POST /api/compare and POST /api/compare/search
const handleCompareSearch = async (req: any, res: any) => {
  try {
    const {
      query,
      q,
      category: rawCategory,
      location,
      area: rawArea,
      city: rawCity,
      pincode: rawPincode,
      platforms,
      platform,
      vegOnly,
      nonVegOnly,
      vegetarian,
      minPrice,
      maxPrice,
      sortBy,
      membership,
      userId: bodyUserId
    } = req.body || {};

    const userId = bodyUserId || (req.headers['x-user-id'] as string) || 'default_user';
    const searchQuery = (query ?? q ?? '').toString().trim();
    const category = (rawCategory && rawCategory !== 'All') ? rawCategory.toString().trim() : null;

    let locArea = '';
    let locCity = 'Bangalore';
    let locPincode = '';

    if (typeof location === 'string') {
      locArea = location.trim();
    } else if (location && typeof location === 'object') {
      locArea = (location.name || location.area || '').toString().trim();
      locCity = (location.city || '').toString().trim() || 'Bangalore';
      locPincode = (location.pincode || '').toString().trim();
    }

    if (!locArea) {
      locArea = (rawArea || '').toString().trim();
    }
    if (!locCity || locCity === 'Bangalore') {
      locCity = (rawCity || 'Bangalore').toString().trim();
    }
    if (!locPincode) {
      locPincode = (rawPincode || '').toString().trim();
    }

    // Normalize Bengaluru to Bangalore
    if (locCity.toLowerCase() === 'bengaluru') {
      locCity = 'Bangalore';
    }

    // Check Swiggy connection status for this user
    const swiggyStatus = SwiggyMcpClient.getInstance().getStatus(userId);
    const isSwiggyConnected = swiggyStatus.connected && swiggyStatus.status === 'AUTHORIZED';
    const isZomatoAuthorized = Boolean(process.env.ZOMATO_API_KEY && process.env.ZOMATO_API_KEY.trim().length > 0);

    const swiggyState = isSwiggyConnected ? 'LIVE' : 'AUTH_REQUIRED';
    const zomatoState = isZomatoAuthorized ? 'LIVE' : 'NOT_CONFIGURED';

    const platformStatus = {
      swiggy: swiggyState,
      zomato: zomatoState,
      eatclub: 'LIVE',
      direct: 'LIVE'
    };

    // Execute deep live comparison using ComparisonService
    const comparisonResponse = await ComparisonService.compare({
      query: searchQuery,
      location: locArea || 'Indiranagar',
      area: locArea || 'Indiranagar',
      city: locCity,
      userId
    });

    let isVeg: boolean | undefined = undefined;
    if (vegOnly === true) isVeg = true;
    else if (nonVegOnly === true) isVeg = false;
    else if (vegetarian !== undefined) isVeg = Boolean(vegetarian);

    const platformCode = platform || (Array.isArray(platforms) && platforms.length === 1 ? platforms[0] : undefined);

    const results = SearchEngine.search({
      query: searchQuery,
      category: category || undefined,
      city: locCity,
      area: locArea,
      pincode: locPincode,
      vegetarian: isVeg,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      platform: platformCode,
      sortBy: sortBy as any,
      hasMembership: Boolean(membership),
      userId
    });

    const platformsArray = [
      {
        platform: 'swiggy',
        status: swiggyState,
        results: isSwiggyConnected ? results : []
      },
      {
        platform: 'zomato',
        status: zomatoState,
        results: isZomatoAuthorized ? results : []
      },
      {
        platform: 'eatclub',
        status: 'LIVE',
        results: results
      },
      {
        platform: 'direct',
        status: 'LIVE',
        results: results
      }
    ];

    res.json({
      success: true,
      query: searchQuery,
      location: locArea || 'Indiranagar',
      items: comparisonResponse.items,
      count: results.length,
      results: results,
      data: results,
      platformStatus,
      platforms: platformsArray,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Compare search error:', error);
    res.status(500).json({
      success: false,
      message: 'FoodCompare server encountered an unexpected error. Please try again.'
    });
  }
};

// POST /api/compare - Standardized Comparison Contract
router.post('/', handleCompareSearch);

// POST /api/compare/search - Standardized Search Contract
router.post('/search', handleCompareSearch);

export default router;

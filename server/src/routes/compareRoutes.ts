import { Router } from 'express';
import { db } from '../db/database.js';
import { NormalizationEngine } from '../engine/NormalizationEngine.js';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';

const router = Router();

// Get complete comparison details for a specific product
router.get('/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const { membership } = req.query;
    const hasMembership = membership === 'true';

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

    // 2. Check Swiggy connection status
    const swiggyStatus = SwiggyMcpClient.getInstance().getStatus();
    const isSwiggyConnected = swiggyStatus.connected && swiggyStatus.status === 'AUTHORIZED';

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
      let finalPrice = p.final_price;
      let membershipApplied = false;
      let activeMembershipDiscount = 0;

      const isSwiggy = p.platform_code === 'swiggy';
      const dataProvenance = isSwiggy ? (isSwiggyConnected ? 'AUTHORIZED' : 'INTEGRATION_PENDING') : 'AUTHORIZED';
      const finalPriceUnavailable = isSwiggy ? !isSwiggyConnected : false;
      const unavailabilityReason = finalPriceUnavailable
        ? 'Swiggy MCP integration pending. Final payable price unavailable without authorized session.'
        : undefined;

      if (hasMembership && (p.platform_code === 'swiggy' || p.platform_code === 'zomato') && !finalPriceUnavailable) {
        activeMembershipDiscount = Math.round(p.item_price * 0.10) + p.delivery_fee;
        finalPrice = Math.max(0, p.final_price - activeMembershipDiscount);
        membershipApplied = true;
      }

      // Compute last updated minutes
      const updatedDate = new Date(p.updated_at);
      const minutesAgo = Math.max(1, Math.round((Date.now() - updatedDate.getTime()) / 60000));

      return {
        ...p,
        addons: 0,
        final_price: finalPrice,
        final_price_unavailable: finalPriceUnavailable,
        unavailability_reason: unavailabilityReason,
        data_provenance: dataProvenance,
        membership_applied: membershipApplied,
        active_membership_discount: activeMembershipDiscount,
        last_updated_human: `${minutesAgo} minutes ago`
      };
    });

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
      }))
    );

    // 4. Fetch price history
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
      : comparisonSummary.cheapestFinalPrice;

    // 5. Product matches (confidence score records)
    const matches = db.prepare(`
      SELECT 
        pm.*,
        plat.name AS platform_name,
        plat.code AS platform_code
      FROM product_matches pm
      JOIN platforms plat ON pm.platform_id = plat.id
      WHERE pm.product_id = ?
    `).all(productId);

    // 6. Other branches for this restaurant (Section 8)
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

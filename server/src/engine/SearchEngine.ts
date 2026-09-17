import { db } from '../db/database.js';
import { ProductMatcher } from './ProductMatcher.js';
import { SwiggyMcpClient } from '../services/SwiggyMcpClient.js';

export interface SearchParams {
  query?: string;
  city?: string;
  area?: string;
  pincode?: string;
  cuisine?: string;
  category?: string;
  vegetarian?: boolean;
  maxPrice?: number;
  minPrice?: number;
  platform?: string;
  sortBy?: 'final_price_asc' | 'item_price_asc' | 'discount_desc' | 'fastest' | 'rating';
  hasMembership?: boolean;
}

export class SearchEngine {
  /**
   * Common typo corrections and synonym expansions
   */
  public static cleanQuery(q: string): string {
    return q.trim().toLowerCase();
  }

  /**
   * Search for products, restaurants, cuisines with typo-tolerance and location awareness
   */
  public static search(params: SearchParams) {
    const rawQuery = params.query ? SearchEngine.cleanQuery(params.query) : '';
    const city = params.city || 'Bangalore';
    const area = params.area || '';

    // Step 1: Base SQL query selecting products linked with branch, restaurant, and platform prices
    let sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.category AS product_category,
        p.cuisine AS product_cuisine,
        p.vegetarian,
        p.vegan,
        p.portion_size,
        p.portion_unit,
        p.image AS product_image,
        b.id AS branch_id,
        b.name AS branch_name,
        b.address AS branch_address,
        b.area AS branch_area,
        b.city AS branch_city,
        b.pincode AS branch_pincode,
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        r.logo AS restaurant_logo,
        r.rating AS restaurant_rating
      FROM products p
      JOIN branches b ON p.restaurant_branch_id = b.id
      JOIN restaurants r ON b.restaurant_id = r.id
      WHERE b.is_active = 1
    `;

    const queryArgs: any[] = [];

    // Filter by city if provided
    if (city) {
      sql += ` AND LOWER(b.city) = LOWER(?)`;
      queryArgs.push(city);
    }

    // Filter by area if specified (delivery radius check)
    if (area) {
      sql += ` AND (LOWER(b.area) = LOWER(?) OR b.area LIKE ?)`;
      queryArgs.push(area, `%${area}%`);
    }

    // Vegetarian filter
    if (params.vegetarian === true) {
      sql += ` AND p.vegetarian = 1`;
    }

    // Cuisine filter
    if (params.cuisine) {
      sql += ` AND (LOWER(p.cuisine) = LOWER(?) OR LOWER(r.cuisine) LIKE ?)`;
      queryArgs.push(params.cuisine, `%${params.cuisine}%`);
    }

    // Category filter
    if (params.category) {
      sql += ` AND LOWER(p.category) = LOWER(?)`;
      queryArgs.push(params.category);
    }

    const rows = db.prepare(sql).all(...queryArgs) as any[];

    // Step 2: In-memory fuzzy / typo-tolerant scoring if query is provided
    let results = rows;
    if (rawQuery) {
      const queryTokens = ProductMatcher.tokenize(rawQuery);

      results = rows.map(item => {
        const itemTokens = ProductMatcher.tokenize(`${item.product_name} ${item.restaurant_name} ${item.product_category} ${item.product_cuisine || ''}`);
        
        // Exact substring check
        const combinedText = `${item.product_name} ${item.restaurant_name} ${item.branch_name} ${item.product_category}`.toLowerCase();
        let score = 0;

        if (combinedText.includes(rawQuery)) {
          score += 1.0; // High exact match bonus
        }

        // Token overlap
        const matched = queryTokens.filter(qt => itemTokens.some(it => it.includes(qt) || qt.includes(it)));
        if (queryTokens.length > 0) {
          score += (matched.length / queryTokens.length) * 0.8;
        }

        // Typo tolerance via Dice coefficient on dish and restaurant names
        const dishDice = ProductMatcher.diceCoefficient(rawQuery, item.product_name);
        const restDice = ProductMatcher.diceCoefficient(rawQuery, item.restaurant_name);
        score += Math.max(dishDice, restDice) * 0.6;

        return { ...item, relevanceScore: score };
      })
      .filter(item => item.relevanceScore > 0.25)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Step 3: Attach platform pricing details to each product
    const getPricesStmt = db.prepare(`
      SELECT 
        pp.id,
        pp.platform_id,
        pp.item_price,
        pp.delivery_fee,
        pp.platform_fee,
        pp.packaging_fee,
        pp.taxes,
        pp.discount,
        pp.final_price,
        pp.membership_discount,
        pp.membership_type,
        pp.currency,
        pp.order_url,
        pp.availability,
        pp.updated_at,
        plat.name AS platform_name,
        plat.code AS platform_code,
        plat.logo_url AS platform_logo,
        plat.integration_status,
        plat.is_official
      FROM product_prices pp
      JOIN platforms plat ON pp.platform_id = plat.id
      WHERE pp.product_id = ?
    `);

    // Swiggy connection status check
    const swiggyStatus = SwiggyMcpClient.getInstance().getStatus();
    const isSwiggyConnected = swiggyStatus.connected && swiggyStatus.status === 'AUTHORIZED';

    const enrichedResults = results.map(item => {
      const prices = (getPricesStmt.all(item.product_id) as any[]).map(p => {
        const isSwiggy = p.platform_code === 'swiggy';
        const finalPriceUnavailable = isSwiggy ? !isSwiggyConnected : false;
        const dataProvenance = isSwiggy ? (isSwiggyConnected ? 'AUTHORIZED' : 'INTEGRATION_PENDING') : 'AUTHORIZED';

        // Recalculate if user enabled membership (e.g. Swiggy One or Zomato Gold)
        let finalPrice = p.final_price;
        let membershipApplied = false;
        let activeMembershipDiscount = 0;

        if (params.hasMembership && !finalPriceUnavailable) {
          if (p.platform_code === 'swiggy' || p.platform_code === 'zomato') {
            // Free delivery + extra 10% off
            activeMembershipDiscount = Math.round(p.item_price * 0.10) + p.delivery_fee;
            finalPrice = Math.max(0, p.final_price - activeMembershipDiscount);
            membershipApplied = true;
          }
        }

        return {
          ...p,
          addons: 0,
          final_price: finalPrice,
          final_price_unavailable: finalPriceUnavailable,
          data_provenance: dataProvenance,
          membership_applied: membershipApplied,
          membership_discount: activeMembershipDiscount || p.membership_discount
        };
      });

      // Find lowest and highest prices (only across verified prices for final totals)
      const validPrices = prices.filter(p => p.availability);
      const verifiedFinalPrices = validPrices.filter(p => !p.final_price_unavailable && p.final_price > 0);

      const lowestFinal = verifiedFinalPrices.length > 0 ? Math.min(...verifiedFinalPrices.map(p => p.final_price)) : 0;
      const highestFinal = verifiedFinalPrices.length > 0 ? Math.max(...verifiedFinalPrices.map(p => p.final_price)) : 0;
      const lowestItem = validPrices.length > 0 ? Math.min(...validPrices.map(p => p.item_price)) : 0;
      const maxSavings = verifiedFinalPrices.length >= 2 ? Math.max(0, highestFinal - lowestFinal) : 0;

      // Normalized price per 100g
      let pricePer100g = null;
      if (item.portion_size && item.portion_size > 0 && item.portion_unit === 'g') {
        const basePrice = lowestFinal > 0 ? lowestFinal : lowestItem;
        pricePer100g = Math.round((basePrice / item.portion_size) * 100 * 10) / 10;
      }

      return {
        ...item,
        prices,
        lowestFinalPrice: lowestFinal,
        highestFinalPrice: highestFinal,
        lowestItemPrice: lowestItem,
        maxSavings,
        pricePer100g,
        savingsText: maxSavings > 0
          ? `Save ₹${maxSavings} vs highest verified total`
          : verifiedFinalPrices.length >= 2
            ? 'Same price across verified platforms'
            : 'Multi-platform pricing'
      };
    });

    // Step 4: Apply Price filtering and sorting
    let filtered = enrichedResults;

    if (params.minPrice !== undefined) {
      filtered = filtered.filter(item => item.lowestFinalPrice >= params.minPrice!);
    }
    if (params.maxPrice !== undefined) {
      filtered = filtered.filter(item => item.lowestFinalPrice <= params.maxPrice!);
    }
    if (params.platform) {
      filtered = filtered.filter(item => 
        item.prices.some((p: any) => p.platform_code.toLowerCase() === params.platform!.toLowerCase())
      );
    }

    // Sorting
    if (params.sortBy === 'final_price_asc') {
      filtered.sort((a, b) => a.lowestFinalPrice - b.lowestFinalPrice);
    } else if (params.sortBy === 'item_price_asc') {
      filtered.sort((a, b) => a.lowestItemPrice - b.lowestItemPrice);
    } else if (params.sortBy === 'discount_desc') {
      filtered.sort((a, b) => b.maxSavings - a.maxSavings);
    } else if (params.sortBy === 'rating') {
      filtered.sort((a, b) => b.restaurant_rating - a.restaurant_rating);
    }

    return filtered;
  }
}

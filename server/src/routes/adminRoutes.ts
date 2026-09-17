import { Router } from 'express';
import { db } from '../db/database.js';
import { ProductMatcher } from '../engine/ProductMatcher.js';

const router = Router();

// Metrics summary
router.get('/metrics', (req, res) => {
  const restaurantCount = (db.prepare('SELECT COUNT(*) as c FROM restaurants').get() as any).c;
  const branchCount = (db.prepare('SELECT COUNT(*) as c FROM branches').get() as any).c;
  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c;
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const pendingMatchCount = (db.prepare("SELECT COUNT(*) as c FROM product_matches WHERE verification_status = 'pending_review'").get() as any).c;
  const searchCount = (db.prepare('SELECT COUNT(*) as c FROM search_history').get() as any).c;

  res.json({
    success: true,
    data: {
      restaurantCount,
      branchCount,
      productCount,
      userCount,
      pendingMatchCount,
      searchCount
    }
  });
});

// Manage Restaurants & Branches
router.get('/restaurants', (req, res) => {
  const restaurants = db.prepare(`
    SELECT r.*, COUNT(b.id) AS branch_count
    FROM restaurants r
    LEFT JOIN branches b ON r.id = b.restaurant_id
    GROUP BY r.id
    ORDER BY r.name ASC
  `).all();

  const branches = db.prepare(`
    SELECT b.*, r.name AS restaurant_name
    FROM branches b
    JOIN restaurants r ON b.restaurant_id = r.id
    ORDER BY r.name ASC, b.name ASC
  `).all();

  res.json({ success: true, data: { restaurants, branches } });
});

router.post('/restaurants', (req, res) => {
  const { name, cuisine, description, rating, priceForTwo, logo } = req.body;
  if (!name || !cuisine) {
    return res.status(400).json({ success: false, message: 'Name and cuisine required' });
  }

  const id = `rest_${Date.now()}`;
  db.prepare(`
    INSERT INTO restaurants (id, name, cuisine, description, rating, price_for_two, logo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, cuisine, description || '', rating || 4.2, priceForTwo || 400, logo || 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=120&h=120&fit=crop');

  res.json({ success: true, message: 'Restaurant added successfully', id });
});

router.post('/branches', (req, res) => {
  const { restaurantId, name, address, city, area, pincode } = req.body;
  if (!restaurantId || !name || !city || !area) {
    return res.status(400).json({ success: false, message: 'Missing branch fields' });
  }

  const id = `br_${Date.now()}`;
  db.prepare(`
    INSERT INTO branches (id, restaurant_id, name, address, city, area, pincode, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, restaurantId, name, address || '', city, area, pincode || '560001');

  res.json({ success: true, message: 'Branch created successfully', id });
});

// Products & Price Management
router.get('/products', (req, res) => {
  const products = db.prepare(`
    SELECT 
      p.*,
      b.name AS branch_name,
      b.area AS branch_area,
      r.name AS restaurant_name,
      COUNT(pp.id) AS price_count
    FROM products p
    JOIN branches b ON p.restaurant_branch_id = b.id
    JOIN restaurants r ON b.restaurant_id = r.id
    LEFT JOIN product_prices pp ON p.id = pp.product_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();

  res.json({ success: true, data: products });
});

router.post('/products', (req, res) => {
  const { branchId, name, description, category, cuisine, vegetarian, portionSize, portionUnit, image, prices } = req.body;
  if (!branchId || !name || !category) {
    return res.status(400).json({ success: false, message: 'Missing product details' });
  }

  const id = `prod_${Date.now()}`;
  db.prepare(`
    INSERT INTO products (
      id, restaurant_branch_id, name, normalized_name, description, category,
      cuisine, vegetarian, vegan, portion_size, portion_unit, image
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(
    id,
    branchId,
    name,
    name.toLowerCase(),
    description || '',
    category,
    cuisine || 'Indian',
    vegetarian ? 1 : 0,
    portionSize || 500,
    portionUnit || 'g',
    image || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&h=350&fit=crop'
  );

  // If initial platform prices provided, insert them
  if (Array.isArray(prices)) {
    const insertPrice = db.prepare(`
      INSERT INTO product_prices (
        id, product_id, platform_id, item_price, delivery_fee, platform_fee,
        packaging_fee, taxes, discount, final_price, currency, availability
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 1)
    `);

    for (const p of prices) {
      const finalPrice = Math.max(0, (p.itemPrice || 0) + (p.deliveryFee || 0) + (p.platformFee || 0) + (p.packagingFee || 0) + (p.taxes || 0) - (p.discount || 0));
      insertPrice.run(
        `pr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        id,
        p.platformId,
        p.itemPrice || 0,
        p.deliveryFee || 0,
        p.platformFee || 0,
        p.packagingFee || 0,
        p.taxes || 0,
        p.discount || 0,
        finalPrice
      );
    }
  }

  res.json({ success: true, message: 'Product created successfully', id });
});

router.put('/products/:id/availability', (req, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  db.prepare('UPDATE products SET is_available = ? WHERE id = ?').run(isAvailable ? 1 : 0, id);
  res.json({ success: true, message: `Product availability set to ${isAvailable}` });
});

// Product Match Reviews (Low Confidence Matches & Verification)
router.get('/matches', (req, res) => {
  const matches = db.prepare(`
    SELECT 
      pm.*,
      p.name AS product_name,
      p.category,
      p.portion_size,
      p.portion_unit,
      r.name AS restaurant_name,
      b.area AS branch_area,
      plat.name AS platform_name,
      plat.code AS platform_code
    FROM product_matches pm
    JOIN products p ON pm.product_id = p.id
    JOIN branches b ON p.restaurant_branch_id = b.id
    JOIN restaurants r ON b.restaurant_id = r.id
    JOIN platforms plat ON pm.platform_id = plat.id
    ORDER BY pm.confidence_score ASC
  `).all();

  res.json({ success: true, data: matches });
});

router.put('/matches/:matchId/status', (req, res) => {
  const { matchId } = req.params;
  const { status } = req.body; // 'verified' or 'rejected'

  if (!['verified', 'rejected', 'pending_review'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  db.prepare('UPDATE product_matches SET verification_status = ? WHERE id = ?').run(status, matchId);
  res.json({ success: true, message: `Match status updated to ${status}` });
});

// Test Match Engine Tester
router.post('/matches/test-algorithm', (req, res) => {
  const { sourceName, targetName, sourceVeg, targetVeg, sourcePortion, targetPortion, category } = req.body;
  const result = ProductMatcher.compare(
    { name: sourceName, vegetarian: sourceVeg ?? false, portionSize: sourcePortion, category },
    { name: targetName, vegetarian: targetVeg ?? false, portionSize: targetPortion, category }
  );

  res.json({ success: true, data: result });
});

// Platform Integrations Manager
router.get('/platforms', (req, res) => {
  const platforms = db.prepare('SELECT * FROM platforms ORDER BY name ASC').all();
  res.json({ success: true, data: platforms });
});

router.put('/platforms/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'authorized', 'pending', 'partner_feed'

  db.prepare('UPDATE platforms SET integration_status = ? WHERE id = ?').run(status, id);
  res.json({ success: true, message: 'Platform status updated' });
});

// Recent Searches Log
router.get('/searches', (req, res) => {
  const searches = db.prepare(`
    SELECT * FROM search_history
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  res.json({ success: true, data: searches });
});

export default router;

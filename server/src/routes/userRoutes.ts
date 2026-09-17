import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'foodcompare_super_secret_jwt_key_2026';

// Middleware to extract user
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// 1. Favorites
router.get('/favorites', requireAuth, (req: any, res) => {
  const favorites = db.prepare(`
    SELECT 
      f.id AS favorite_id,
      f.created_at AS saved_at,
      p.id AS product_id,
      p.name AS product_name,
      p.category,
      p.portion_size,
      p.portion_unit,
      p.image,
      r.name AS restaurant_name,
      b.area AS branch_area,
      MIN(pp.final_price) AS best_price
    FROM favorites f
    JOIN products p ON f.product_id = p.id
    JOIN branches b ON p.restaurant_branch_id = b.id
    JOIN restaurants r ON b.restaurant_id = r.id
    LEFT JOIN product_prices pp ON p.id = pp.product_id AND pp.availability = 1
    WHERE f.user_id = ?
    GROUP BY p.id
    ORDER BY f.created_at DESC
  `).all(req.user.id);

  res.json({ success: true, data: favorites });
});

router.post('/favorites/toggle', requireAuth, (req: any, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, message: 'productId is required' });
  }

  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(req.user.id, productId) as any;

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    return res.json({ success: true, isFavorite: false, message: 'Removed from favorites' });
  } else {
    const id = `fav_${Date.now()}`;
    db.prepare('INSERT INTO favorites (id, user_id, product_id) VALUES (?, ?, ?)').run(id, req.user.id, productId);
    return res.json({ success: true, isFavorite: true, message: 'Added to favorites' });
  }
});

// 2. Price Alerts
router.get('/alerts', requireAuth, (req: any, res) => {
  const alerts = db.prepare(`
    SELECT 
      pa.id AS alert_id,
      pa.target_price,
      pa.active,
      pa.created_at,
      p.id AS product_id,
      p.name AS product_name,
      p.image,
      r.name AS restaurant_name,
      b.area AS branch_area,
      MIN(pp.final_price) AS current_best_price
    FROM price_alerts pa
    JOIN products p ON pa.product_id = p.id
    JOIN branches b ON p.restaurant_branch_id = b.id
    JOIN restaurants r ON b.restaurant_id = r.id
    LEFT JOIN product_prices pp ON p.id = pp.product_id AND pp.availability = 1
    WHERE pa.user_id = ?
    GROUP BY pa.id
    ORDER BY pa.created_at DESC
  `).all(req.user.id);

  res.json({ success: true, data: alerts });
});

router.post('/alerts', requireAuth, (req: any, res) => {
  const { productId, targetPrice } = req.body;
  if (!productId || !targetPrice) {
    return res.status(400).json({ success: false, message: 'productId and targetPrice are required' });
  }

  const id = `alt_${Date.now()}`;
  db.prepare(`
    INSERT INTO price_alerts (id, user_id, product_id, target_price, active)
    VALUES (?, ?, ?, ?, 1)
  `).run(id, req.user.id, productId, targetPrice);

  res.json({ success: true, message: 'Price alert created successfully', alertId: id });
});

router.delete('/alerts/:alertId', requireAuth, (req: any, res) => {
  const { alertId } = req.params;
  db.prepare('DELETE FROM price_alerts WHERE id = ? AND user_id = ?').run(alertId, req.user.id);
  res.json({ success: true, message: 'Alert removed' });
});

// 3. Search History
router.get('/history', (req, res) => {
  const history = db.prepare(`
    SELECT id, query, location, created_at
    FROM search_history
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  res.json({ success: true, data: history });
});

export default router;

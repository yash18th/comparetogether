import { Router } from 'express';
import { SearchEngine } from '../engine/SearchEngine.js';
import { db } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const {
      q,
      city,
      area,
      pincode,
      cuisine,
      category,
      vegetarian,
      minPrice,
      maxPrice,
      platform,
      sortBy,
      membership
    } = req.query;

    const results = SearchEngine.search({
      query: q as string,
      city: city as string,
      area: area as string,
      pincode: pincode as string,
      cuisine: cuisine as string,
      category: category as string,
      vegetarian: vegetarian === 'true' ? true : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      platform: platform as string,
      sortBy: sortBy as any,
      hasMembership: membership === 'true'
    });

    // Record search history if user query is present
    if (q && (q as string).trim().length > 1) {
      try {
        db.prepare(`
          INSERT INTO search_history (id, query, location)
          VALUES (?, ?, ?)
        `).run(`sh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, (q as string).trim(), area ? `${area}, ${city || 'Bangalore'}` : (city || 'Bangalore'));
      } catch (err) {
        // Silently ignore history insert errors
      }
    }

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router;

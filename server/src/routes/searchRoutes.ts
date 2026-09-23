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
      membership,
      userId: queryUserId
    } = req.query;

    const userId = (queryUserId as string) || (req.headers['x-user-id'] as string) || 'default_user';

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
      hasMembership: membership === 'true',
      userId
    });

    // Record search history if user query is present
    if (q && (q as string).trim().length > 1) {
      try {
        db.prepare(`
          INSERT INTO search_history (id, user_id, query, location, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          `sh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId !== 'default_user' ? userId : null,
          (q as string).trim(),
          area ? `${area}, ${city || 'Bangalore'}` : (city || 'Bangalore')
        );
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

router.post('/', (req, res) => {
  try {
    const {
      query,
      q,
      category,
      location,
      area,
      city,
      pincode,
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
    const locArea = (location?.name || area || '').toString().trim();
    const locCity = (location?.city || city || 'Bangalore').toString().trim();
    const locPincode = (location?.pincode || pincode || '').toString().trim();

    let isVeg: boolean | undefined = undefined;
    if (vegOnly === true) isVeg = true;
    else if (nonVegOnly === true) isVeg = false;
    else if (vegetarian !== undefined) isVeg = Boolean(vegetarian);

    const platformCode = platform || (Array.isArray(platforms) && platforms.length === 1 ? platforms[0] : undefined);

    const results = SearchEngine.search({
      query: searchQuery,
      category: category && category !== 'All' ? category : undefined,
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

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error: any) {
    console.error('Search POST error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router;

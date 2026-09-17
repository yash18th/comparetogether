import { searchCatalog } from '../_lib/engine';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const query = (body.query ?? body.q ?? req.query.q ?? req.query.query ?? '').toString();
    const category = body.category || req.query.category;
    const location = body.location || {};
    const area = location.name || body.area || req.query.area || '';
    const city = location.city || body.city || req.query.city || 'Bangalore';
    const pincode = location.pincode || body.pincode || req.query.pincode || '';

    let vegetarian: boolean | undefined = undefined;
    if (body.vegOnly === true) vegetarian = true;
    else if (body.nonVegOnly === true) vegetarian = false;
    else if (body.vegetarian !== undefined) vegetarian = Boolean(body.vegetarian);
    else if (req.query.vegetarian !== undefined) vegetarian = req.query.vegetarian === 'true';

    const minPrice = body.minPrice ? Number(body.minPrice) : req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = body.maxPrice ? Number(body.maxPrice) : req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const platform = body.platform || req.query.platform;
    const sortBy = body.sortBy || req.query.sortBy;
    const hasMembership = Boolean(body.membership || req.query.membership === 'true');

    const results = searchCatalog({
      query,
      category,
      city,
      area,
      pincode,
      vegetarian,
      minPrice,
      maxPrice,
      platform,
      sortBy,
      hasMembership
    });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error searching catalog' });
  }
}

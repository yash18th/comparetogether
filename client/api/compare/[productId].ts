import { getProductComparison } from '../_lib/engine';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { productId } = req.query;
    const hasMembership = req.query.membership === 'true';

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Missing product ID' });
    }

    const data = getProductComparison(productId as string, hasMembership);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error loading comparison' });
  }
}

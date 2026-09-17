import { PRODUCTS, RESTAURANTS, BRANCHES, PRODUCT_PRICES } from '../_lib/catalogData';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    success: true,
    data: {
      usersCount: 2,
      totalSearches: 142,
      totalComparisons: 289,
      productsCount: PRODUCTS.length,
      restaurantsCount: RESTAURANTS.length,
      branchesCount: BRANCHES.length,
      pricesCount: PRODUCT_PRICES.length,
      averageSavings: 38.5,
      activePlatforms: 4,
      swiggyStatus: 'INTEGRATION_PENDING',
      zomatoStatus: 'INTEGRATION_PENDING'
    }
  });
}

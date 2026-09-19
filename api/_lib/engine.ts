import { RESTAURANTS, BRANCHES, PRODUCTS, PRODUCT_PRICES, PRODUCT_MATCHES, PRICE_HISTORY } from './catalogData';

export interface SearchParams {
  query?: string;
  category?: string;
  city?: string;
  area?: string;
  pincode?: string;
  cuisine?: string;
  vegetarian?: boolean;
  minPrice?: number;
  maxPrice?: number;
  platform?: string;
  sortBy?: 'final_price_asc' | 'item_price_asc' | 'discount_desc' | 'fastest' | 'rating';
  hasMembership?: boolean;
}

export function searchCatalog(params: SearchParams) {
  const rawQuery = (params.query || '').trim().toLowerCase();
  const city = (params.city || 'Bangalore').toLowerCase();
  const area = (params.area || '').toLowerCase();
  const category = params.category && params.category !== 'All' ? params.category.toLowerCase() : '';

  // 1. Filter branches & products
  const activeBranches = BRANCHES.filter(b => {
    if (!b.is_active) return false;
    if (city && b.city.toLowerCase() !== city) return false;
    if (area && b.area.toLowerCase() !== area && !b.area.toLowerCase().includes(area)) return false;
    return true;
  });

  const branchMap = new Map(activeBranches.map(b => [b.id, b]));
  const restaurantMap = new Map(RESTAURANTS.map(r => [r.id, r]));

  let matchedProducts = PRODUCTS.filter(p => {
    const branch = branchMap.get(p.restaurant_branch_id);
    if (!branch) return false;

    if (params.vegetarian === true && !p.vegetarian) return false;
    if (params.vegetarian === false && p.vegetarian) return false;

    if (category) {
      if (p.category.toLowerCase() !== category) return false;
    }

    if (params.cuisine) {
      const c = params.cuisine.toLowerCase();
      if (!p.cuisine.toLowerCase().includes(c)) return false;
    }

    return true;
  });

  // 2. Fuzzy / Keyword search scoring if query provided
  let scoredItems = matchedProducts.map(p => {
    const branch = branchMap.get(p.restaurant_branch_id)!;
    const rest = restaurantMap.get(branch.restaurant_id)!;
    let score = 1.0;

    if (rawQuery) {
      const text = `${p.name} ${rest.name} ${branch.name} ${p.category} ${p.cuisine}`.toLowerCase();
      const tokens = rawQuery.split(/\s+/).filter(Boolean);
      let matchCount = 0;
      for (const t of tokens) {
        if (text.includes(t)) matchCount++;
      }
      if (text.includes(rawQuery)) {
        score += 2.0;
      }
      score += (matchCount / tokens.length) * 1.5;
      if (matchCount === 0 && !text.includes(rawQuery)) {
        score = 0;
      }
    }

    return {
      product: p,
      branch,
      restaurant: rest,
      score
    };
  });

  if (rawQuery) {
    scoredItems = scoredItems.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  }

  // 3. Attach platform prices to each item
  const results = scoredItems.map(item => {
    const p = item.product;
    const branch = item.branch;
    const rest = item.restaurant;

    const prices = PRODUCT_PRICES.filter(pp => pp.product_id === p.id).map(pp => {
      const isSwiggy = pp.platform_code === 'swiggy';
      const isZomato = pp.platform_code === 'zomato';
      let finalPriceUnavailable = false;
      let status: 'AVAILABLE' | 'AUTH_REQUIRED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' = 'AVAILABLE';
      let statusMessage: string | undefined = undefined;

      if (isSwiggy) {
        finalPriceUnavailable = true;
        status = 'AUTH_REQUIRED';
        statusMessage = 'Swiggy authorization is required';
      } else if (isZomato) {
        finalPriceUnavailable = true;
        status = 'NOT_CONFIGURED';
        statusMessage = 'Authorized Zomato API access is not configured';
      } else {
        status = pp.availability ? 'AVAILABLE' : 'UNAVAILABLE';
      }

      let finalPrice: number | null = finalPriceUnavailable ? null : pp.final_price;
      let membershipApplied = false;

      if (params.hasMembership && !finalPriceUnavailable && finalPrice !== null && pp.membership_discount > 0) {
        finalPrice = Math.max(0, finalPrice - pp.membership_discount);
        membershipApplied = true;
      }

      return {
        id: pp.id,
        platform_id: pp.platform_id,
        status,
        status_message: statusMessage,
        item_price: finalPriceUnavailable ? null : pp.item_price,
        delivery_fee: finalPriceUnavailable ? null : pp.delivery_fee,
        platform_fee: finalPriceUnavailable ? null : pp.platform_fee,
        packaging_fee: finalPriceUnavailable ? null : pp.packaging_fee,
        taxes: finalPriceUnavailable ? null : pp.taxes,
        discount: pp.discount,
        final_price: finalPrice,
        membership_discount: pp.membership_discount,
        membership_type: pp.membership_type,
        currency: pp.currency,
        order_url: pp.order_url,
        availability: pp.availability,
        updated_at: pp.updated_at,
        platform_name: pp.platform_name,
        platform_code: pp.platform_code,
        platform_logo: pp.platform_logo,
        integration_status: pp.integration_status,
        is_official: pp.is_official,
        addons: 0,
        final_price_unavailable: finalPriceUnavailable,
        unavailability_reason: statusMessage,
        data_provenance: isSwiggy ? 'INTEGRATION_PENDING' : isZomato ? 'INTEGRATION_PENDING' : 'AUTHORIZED',
        membership_applied: membershipApplied
      };
    }).filter(pr => {
      if (params.platform && pr.platform_code !== params.platform) return false;
      return true;
    });

    const verifiedPrices = prices.filter(pr => !pr.final_price_unavailable && pr.final_price !== null && pr.final_price > 0);
    const validPrices = prices.filter(pr => pr.item_price !== null && pr.item_price > 0);

    const lowestFinalPrice = verifiedPrices.length > 0 ? Math.min(...verifiedPrices.map(pr => pr.final_price!)) : 0;
    const highestFinalPrice = verifiedPrices.length > 0 ? Math.max(...verifiedPrices.map(pr => pr.final_price!)) : 0;
    const lowestItemPrice = validPrices.length > 0 ? Math.min(...validPrices.map(pr => pr.item_price!)) : 0;
    const maxSavings = verifiedPrices.length >= 2 ? Math.max(0, highestFinalPrice - lowestFinalPrice) : 0;

    let pricePer100g: number | undefined = undefined;
    if (p.portion_size && (p.portion_unit === 'g' || p.portion_unit === 'ml')) {
      const basePrice = lowestFinalPrice > 0 ? lowestFinalPrice : lowestItemPrice;
      if (basePrice > 0) {
        pricePer100g = Math.round((basePrice / p.portion_size) * 100 * 10) / 10;
      }
    }

    const savingsText = verifiedPrices.length >= 2
      ? (maxSavings > 0 ? `Save ₹${maxSavings} vs highest verified total` : 'Same price across verified platforms')
      : 'Platform price unavailable';

    return {
      product_id: p.id,
      product_name: p.name,
      product_description: p.description,
      product_category: p.category,
      product_cuisine: p.cuisine,
      vegetarian: p.vegetarian,
      vegan: p.vegan,
      portion_size: p.portion_size,
      portion_unit: p.portion_unit,
      product_image: p.image,
      branch_id: branch.id,
      branch_name: branch.name,
      branch_address: branch.address,
      branch_area: branch.area,
      branch_city: branch.city,
      branch_pincode: branch.pincode,
      restaurant_id: rest.id,
      restaurant_name: rest.name,
      restaurant_logo: rest.logo,
      restaurant_rating: rest.rating,
      relevanceScore: item.score,
      prices,
      lowestFinalPrice,
      highestFinalPrice,
      lowestItemPrice,
      maxSavings,
      pricePer100g,
      savingsText
    };
  });

  // Filter price range
  let filtered = results;
  if (params.minPrice !== undefined) {
    filtered = filtered.filter(r => r.lowestFinalPrice >= params.minPrice!);
  }
  if (params.maxPrice !== undefined) {
    filtered = filtered.filter(r => r.lowestFinalPrice <= params.maxPrice!);
  }

  // Sort
  if (params.sortBy === 'item_price_asc') {
    filtered.sort((a, b) => a.lowestItemPrice - b.lowestItemPrice);
  } else if (params.sortBy === 'discount_desc') {
    filtered.sort((a, b) => b.maxSavings - a.maxSavings);
  } else if (params.sortBy === 'rating') {
    filtered.sort((a, b) => b.restaurant_rating - a.restaurant_rating);
  } else {
    // default: final_price_asc
    filtered.sort((a, b) => a.lowestFinalPrice - b.lowestFinalPrice);
  }

  return filtered;
}

export function getProductComparison(productId: string, hasMembership = false) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return null;

  const branch = BRANCHES.find(b => b.id === product.restaurant_branch_id);
  const restaurant = branch ? RESTAURANTS.find(r => r.id === branch.restaurant_id) : null;

  const prices = PRODUCT_PRICES.filter(pp => pp.product_id === product.id).map(pp => {
    let finalPrice = pp.final_price;
    let membershipApplied = false;
    if (hasMembership && pp.membership_discount > 0) {
      finalPrice = Math.max(0, pp.final_price - pp.membership_discount);
      membershipApplied = true;
    }
    return {
      id: pp.id,
      platform_id: pp.platform_id,
      item_price: pp.item_price,
      delivery_fee: pp.delivery_fee,
      platform_fee: pp.platform_fee,
      packaging_fee: pp.packaging_fee,
      taxes: pp.taxes,
      discount: pp.discount,
      final_price: finalPrice,
      membership_discount: pp.membership_discount,
      membership_type: pp.membership_type,
      currency: pp.currency,
      order_url: pp.order_url,
      availability: pp.availability,
      updated_at: pp.updated_at,
      platform_name: pp.platform_name,
      platform_code: pp.platform_code,
      platform_logo: pp.platform_logo,
      integration_status: pp.integration_status,
      is_official: pp.is_official,
      addons: 0,
      final_price_unavailable: Boolean(pp.final_price_unavailable),
      data_provenance: pp.data_provenance,
      membership_applied: membershipApplied
    };
  });

  const verifiedPrices = prices.filter(p => !p.final_price_unavailable && p.final_price > 0);
  const validPrices = prices.filter(p => p.item_price > 0);

  const cheapestFinal = verifiedPrices.length > 0 ? Math.min(...verifiedPrices.map(p => p.final_price)) : 0;
  const highestFinal = verifiedPrices.length > 0 ? Math.max(...verifiedPrices.map(p => p.final_price)) : 0;
  const cheapestItem = validPrices.length > 0 ? Math.min(...validPrices.map(p => p.item_price)) : 0;
  const cheapestPlatform = verifiedPrices.length > 0 ? (verifiedPrices.find(p => p.final_price === cheapestFinal)?.platform_code || '') : '';
  const maxSavings = verifiedPrices.length >= 2 ? Math.max(0, highestFinal - cheapestFinal) : 0;

  const comparison = {
    productId: product.id,
    productName: product.name,
    restaurantName: restaurant?.name || '',
    branchName: branch?.name || '',
    branchArea: branch?.area || '',
    portionSize: product.portion_size,
    portionUnit: product.portion_unit,
    cheapestFinalPrice: cheapestFinal,
    cheapestPlatformCode: cheapestPlatform,
    cheapestItemPrice: cheapestItem,
    highestFinalPrice: highestFinal,
    maxSavings,
    savingsText: maxSavings > 0 ? `You save ₹${maxSavings} vs highest verified total` : 'Verified prices shown'
  };

  const priceHistory = PRICE_HISTORY.filter(ph => ph.product_id === product.id);
  const matches = PRODUCT_MATCHES.filter(pm => pm.source_product_id === product.id || pm.target_product_id === product.id);
  const otherBranches = branch ? BRANCHES.filter(b => b.restaurant_id === branch.restaurant_id && b.id !== branch.id) : [];

  return {
    product: {
      product_id: product.id,
      product_name: product.name,
      product_description: product.description,
      category: product.category,
      cuisine: product.cuisine,
      vegetarian: product.vegetarian,
      vegan: product.vegan,
      portion_size: product.portion_size,
      portion_unit: product.portion_unit,
      image: product.image,
      branch_id: branch?.id,
      branch_name: branch?.name,
      branch_address: branch?.address,
      branch_city: branch?.city,
      branch_area: branch?.area,
      branch_pincode: branch?.pincode,
      restaurant_id: restaurant?.id,
      restaurant_name: restaurant?.name,
      restaurant_logo: restaurant?.logo,
      restaurant_rating: restaurant?.rating,
      restaurant_description: restaurant?.description
    },
    prices,
    comparison,
    priceHistory,
    averagePrice30d: cheapestFinal || cheapestItem,
    matches,
    otherBranches
  };
}

export function getAllLocations() {
  const seen = new Set<string>();
  const list: any[] = [];
  for (const b of BRANCHES) {
    if (!b.is_active) continue;
    const key = `${b.city}:${b.area}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push({
        city: b.city,
        area: b.area,
        pincode: b.pincode
      });
    }
  }
  return list;
}

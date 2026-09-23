/**
 * Canonical Food Model & Engine
 * Provides normalized canonical identity, dish categorization, diet classification, and variant isolation.
 */

export type DietaryType = 'vegetarian' | 'non-vegetarian' | 'vegan';

export interface CanonicalFoodItem {
  id: string;
  canonicalName: string;
  baseDish: string;
  variant: string;
  category: string;
  diet: DietaryType;
  cuisine: string;
  normalizedKeywords: string[];
}

export class CanonicalFoodEngine {
  // Common culinary base dishes
  private static BASE_DISHES: Record<string, { category: string; cuisine: string; defaultDiet: DietaryType }> = {
    'dosa': { category: 'South Indian', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'dosai': { category: 'South Indian', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'idli': { category: 'South Indian', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'vada': { category: 'South Indian', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'uttapam': { category: 'South Indian', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'upma': { category: 'South Indian', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'pongal': { category: 'South Indian', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'biryani': { category: 'Biryani', cuisine: 'Indian', defaultDiet: 'non-vegetarian' },
    'biriyani': { category: 'Biryani', cuisine: 'Indian', defaultDiet: 'non-vegetarian' },
    'briyani': { category: 'Biryani', cuisine: 'Indian', defaultDiet: 'non-vegetarian' },
    'pulao': { category: 'Rice', cuisine: 'Indian', defaultDiet: 'vegetarian' },
    'fried rice': { category: 'Asian', cuisine: 'Chinese', defaultDiet: 'vegetarian' },
    'noodles': { category: 'Asian', cuisine: 'Chinese', defaultDiet: 'vegetarian' },
    'roti': { category: 'Breads', cuisine: 'North Indian', defaultDiet: 'vegetarian' },
    'naan': { category: 'Breads', cuisine: 'North Indian', defaultDiet: 'vegetarian' },
    'paratha': { category: 'Breads', cuisine: 'North Indian', defaultDiet: 'vegetarian' },
    'kulcha': { category: 'Breads', cuisine: 'North Indian', defaultDiet: 'vegetarian' },
    'paneer': { category: 'Curries', cuisine: 'North Indian', defaultDiet: 'vegetarian' },
    'dal': { category: 'Curries', cuisine: 'Indian', defaultDiet: 'vegetarian' },
    'chole': { category: 'Curries', cuisine: 'North Indian', defaultDiet: 'vegetarian' },
    'rajma': { category: 'Curries', cuisine: 'North Indian', defaultDiet: 'vegetarian' },
    'burger': { category: 'Fast Food', cuisine: 'American', defaultDiet: 'non-vegetarian' },
    'pizza': { category: 'Fast Food', cuisine: 'Italian', defaultDiet: 'vegetarian' },
    'sandwich': { category: 'Fast Food', cuisine: 'Continental', defaultDiet: 'vegetarian' },
    'roll': { category: 'Street Food', cuisine: 'Indian', defaultDiet: 'vegetarian' },
    'shawarma': { category: 'Middle Eastern', cuisine: 'Middle Eastern', defaultDiet: 'non-vegetarian' },
    'tea': { category: 'Beverages', cuisine: 'Indian', defaultDiet: 'vegetarian' },
    'chai': { category: 'Beverages', cuisine: 'Indian', defaultDiet: 'vegetarian' },
    'coffee': { category: 'Beverages', cuisine: 'South Indian', defaultDiet: 'vegetarian' },
    'shake': { category: 'Beverages', cuisine: 'Beverages', defaultDiet: 'vegetarian' },
    'juice': { category: 'Beverages', cuisine: 'Beverages', defaultDiet: 'vegan' },
    'gulab jamun': { category: 'Desserts', cuisine: 'Indian', defaultDiet: 'vegetarian' },
    'rasgulla': { category: 'Desserts', cuisine: 'Indian', defaultDiet: 'vegetarian' },
    'ice cream': { category: 'Desserts', cuisine: 'Desserts', defaultDiet: 'vegetarian' }
  };

  // Distinct culinary variants that must never be conflated
  private static VARIANTS = [
    'masala', 'plain', 'butter masala', 'ghee roast', 'rava masala', 'rava',
    'onion rava', 'onion', 'paper', 'set', 'podi', 'cheese', 'mysore masala',
    'mysore', 'open', 'benne', 'karam', 'egg', 'paneer', 'chicken', 'mutton',
    'veg', 'vegetable', 'dum', 'hyderabadi', 'donne', 'ambur', 'lucknowi',
    'malabar', 'chettinad', 'kacchi', 'tandoori', 'tikka', 'kadhai', 'kadai',
    'handi', 'palak', 'shahi', 'makhani', 'schezwan', 'hakka', 'peri peri'
  ];

  private static NON_VEG_INDICATORS = [
    'chicken', 'mutton', 'egg', 'fish', 'prawn', 'shrimp', 'crab', 'pork',
    'beef', 'keema', 'gosht', 'murgh', 'machli', 'seafood', 'bacon', 'ham'
  ];

  private static VEG_INDICATORS = [
    'veg', 'vegetarian', 'paneer', 'mushroom', 'corn', 'aloo', 'gobi', 'soya',
    'dal', 'chole', 'rajma', 'palak', 'methi', 'baby corn'
  ];

  /**
   * Cleans text to standard lowercase alphanumeric
   */
  public static normalizeString(text: string): string {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Resolves a raw food dish name into a strict CanonicalFoodItem
   */
  public static resolveCanonical(name: string, description?: string, explicitVeg?: boolean): CanonicalFoodItem {
    const rawClean = CanonicalFoodEngine.normalizeString(name);
    const descClean = description ? CanonicalFoodEngine.normalizeString(description) : '';
    const combined = `${rawClean} ${descClean}`;

    // 1. Identify base dish
    let matchedBaseDish = 'dish';
    let category = 'Main Course';
    let cuisine = 'Indian';
    let defaultDiet: DietaryType = 'vegetarian';

    // Check longest base dish match first
    const sortedBaseDishes = Object.keys(CanonicalFoodEngine.BASE_DISHES).sort((a, b) => b.length - a.length);
    for (const base of sortedBaseDishes) {
      const regex = new RegExp(`\\b${base}\\b`, 'i');
      if (regex.test(rawClean)) {
        matchedBaseDish = base === 'dosai' ? 'dosa' : (base === 'biriyani' || base === 'briyani') ? 'biryani' : base;
        const info = CanonicalFoodEngine.BASE_DISHES[base];
        category = info.category;
        cuisine = info.cuisine;
        defaultDiet = info.defaultDiet;
        break;
      }
    }

    // 2. Identify variant
    let matchedVariant = '';
    const sortedVariants = [...CanonicalFoodEngine.VARIANTS].sort((a, b) => b.length - a.length);
    for (const v of sortedVariants) {
      const regex = new RegExp(`\\b${v}\\b`, 'i');
      if (regex.test(rawClean)) {
        matchedVariant = v;
        break;
      }
    }

    // Default variant if none explicit
    if (!matchedVariant) {
      if (matchedBaseDish === 'dosa') {
        matchedVariant = rawClean.includes('masala') ? 'masala' : 'plain';
      } else if (matchedBaseDish === 'biryani') {
        matchedVariant = 'dum';
      }
    }

    // 3. Determine dietary classification
    let diet: DietaryType = defaultDiet;

    if (explicitVeg !== undefined) {
      diet = explicitVeg ? 'vegetarian' : 'non-vegetarian';
    } else {
      const hasNonVeg = CanonicalFoodEngine.NON_VEG_INDICATORS.some(i => new RegExp(`\\b${i}\\b`, 'i').test(combined));
      const hasVegExplicit = CanonicalFoodEngine.VEG_INDICATORS.some(i => new RegExp(`\\b${i}\\b`, 'i').test(combined));

      if (hasNonVeg && !rawClean.includes('veg chicken') && !rawClean.includes('soya chaap')) {
        diet = 'non-vegetarian';
      } else if (hasVegExplicit) {
        diet = 'vegetarian';
      }
    }

    // 4. Construct canonical name
    const canonicalTokens: string[] = [];
    if (matchedVariant) {
      canonicalTokens.push(matchedVariant);
    }
    if (matchedBaseDish !== 'dish') {
      canonicalTokens.push(matchedBaseDish);
    } else {
      canonicalTokens.push(rawClean);
    }

    const canonicalName = canonicalTokens.join(' ').trim();
    const id = `canonical_${canonicalName.replace(/\s+/g, '_')}_${diet}`;

    const keywords = Array.from(new Set([
      ...canonicalName.split(' '),
      matchedBaseDish,
      matchedVariant,
      category.toLowerCase(),
      cuisine.toLowerCase(),
      diet
    ].filter(Boolean)));

    return {
      id,
      canonicalName,
      baseDish: matchedBaseDish,
      variant: matchedVariant || 'standard',
      category,
      diet,
      cuisine,
      normalizedKeywords: keywords
    };
  }
}

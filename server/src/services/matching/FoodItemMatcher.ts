/**
 * Food Item Matching Utility
 * Accurately determines if two food dish names from different platforms represent the same item.
 * 
 * Rules:
 * - Normalizes casing, whitespace, punctuation, and common spelling variations (e.g. dosa/dose, biryani/biriyani).
 * - Distinguishes culinary variants and key modifiers (e.g. "Masala Dosa" vs "Cheese Masala Dosa" MUST NOT match).
 */

export interface FoodItemMatchResult {
  isMatch: boolean;
  confidence: number;
  reason?: string;
}

export class FoodItemMatcher {
  /**
   * Common culinary spelling variations normalized to canonical forms
   */
  private static readonly SPELLING_SYNONYMS: Record<string, string> = {
    'dose': 'dosa',
    'dosai': 'dosa',
    'dhosa': 'dosa',
    'biriyani': 'biryani',
    'briyani': 'biryani',
    'birani': 'biryani',
    'panir': 'paneer',
    'pulav': 'pulao',
    'pilaf': 'pulao',
    'parotta': 'paratha',
    'porotta': 'paratha',
    'parotha': 'paratha',
    'nan': 'naan',
    'rotis': 'roti',
    'rooti': 'roti',
    'iddly': 'idli',
    'idly': 'idli',
    'vadai': 'vada',
    'wada': 'vada',
    'sambhar': 'sambar',
    'chhole': 'chole',
    'chana': 'chole',
    'bhatura': 'bhature',
    'tika': 'tikka',
    'shwarma': 'shawarma',
    'shawarama': 'shawarma',
    'noodle': 'noodles',
    'friedrice': 'fried rice',
    'paav': 'pav',
    'bhaaji': 'bhaji',
    'kabab': 'kebab',
    'kebabs': 'kebab'
  };

  /**
   * Distinguishing culinary modifiers and variants.
   * If one item contains a modifier from this set and the other doesn't,
   * they represent different dish preparations and must NOT be matched together.
   */
  private static readonly CRITICAL_MODIFIERS = new Set([
    'cheese', 'butter', 'ghee', 'paneer', 'egg', 'chicken', 'mutton', 'prawn', 'fish',
    'veg', 'nonveg', 'non', 'mysore', 'rava', 'rawa', 'onion', 'plain', 'paper', 'set',
    'mini', 'jumbo', 'double', 'schezwan', 'chilli', 'garlic', 'crispy', 'dry', 'gravy',
    'boneless', 'special', 'masala', 'podi', 'benne', 'chocolate', 'mushroom', 'corn'
  ]);

  /**
   * Words to ignore during semantic comparison
   */
  private static readonly NOISE_WORDS = new Set([
    'the', 'a', 'an', 'fresh', 'hot', 'tasty', 'delicious', 'authentic', 'famous',
    'best', 'signature', 'traditional', 'style', 'pure', 'original'
  ]);

  /**
   * Normalizes raw text:
   * - Lowercases
   * - Decomposes unicode accents
   * - Replaces punctuation with spaces
   * - Normalizes multi-spaces
   */
  public static normalize(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenizes string and canonicalizes culinary spelling synonyms
   */
  public static tokenize(text: string): string[] {
    const normalized = FoodItemMatcher.normalize(text);
    if (!normalized) return [];

    return normalized
      .split(' ')
      .map(token => FoodItemMatcher.SPELLING_SYNONYMS[token] || token)
      .filter(token => token.length > 0 && !FoodItemMatcher.NOISE_WORDS.has(token));
  }

  /**
   * Extracts critical modifiers from token list
   */
  public static extractModifiers(tokens: string[]): Set<string> {
    const modifiers = new Set<string>();
    for (const token of tokens) {
      if (FoodItemMatcher.CRITICAL_MODIFIERS.has(token)) {
        modifiers.add(token);
      }
    }
    return modifiers;
  }

  /**
   * Matches two food items:
   * Returns isMatch: true only if the core dish and modifiers match without variant conflict.
   */
  public static matchFoodItems(
    itemA: { name: string; description?: string; variant?: string | null },
    itemB: { name: string; description?: string; variant?: string | null }
  ): FoodItemMatchResult {
    const tokensA = FoodItemMatcher.tokenize(itemA.name);
    const tokensB = FoodItemMatcher.tokenize(itemB.name);

    if (tokensA.length === 0 || tokensB.length === 0) {
      return { isMatch: false, confidence: 0, reason: 'Empty item name' };
    }

    // 1. Check exact canonical token sequence match
    const stringA = tokensA.join(' ');
    const stringB = tokensB.join(' ');

    if (stringA === stringB) {
      return {
        isMatch: true,
        confidence: 1.0,
        reason: 'Exact canonical dish match'
      };
    }

    // 2. Extract and compare critical modifiers (e.g. "Cheese", "Butter", "Ghee", "Paneer")
    const modsA = FoodItemMatcher.extractModifiers(tokensA);
    const modsB = FoodItemMatcher.extractModifiers(tokensB);

    // If one has extra critical modifiers that the other lacks, they are different products!
    // Example: "Masala Dosa" (modifiers: ['masala']) vs "Cheese Masala Dosa" (modifiers: ['cheese', 'masala'])
    for (const mod of modsA) {
      if (!modsB.has(mod)) {
        return {
          isMatch: false,
          confidence: 0.4,
          reason: `Modifier mismatch: "${mod}" present in "${itemA.name}" but absent in "${itemB.name}"`
        };
      }
    }

    for (const mod of modsB) {
      if (!modsA.has(mod)) {
        return {
          isMatch: false,
          confidence: 0.4,
          reason: `Modifier mismatch: "${mod}" present in "${itemB.name}" but absent in "${itemA.name}"`
        };
      }
    }

    // 3. Compare non-modifier base tokens
    const setB = new Set(tokensB);
    const commonTokens = tokensA.filter(t => setB.has(t));
    const tokenScore = (2 * commonTokens.length) / (tokensA.length + tokensB.length);

    if (tokenScore >= 0.85) {
      return {
        isMatch: true,
        confidence: tokenScore,
        reason: `High semantic similarity match (${Math.round(tokenScore * 100)}%)`
      };
    }

    return {
      isMatch: false,
      confidence: tokenScore,
      reason: `Insufficient token similarity (${Math.round(tokenScore * 100)}%) between "${itemA.name}" and "${itemB.name}"`
    };
  }
}

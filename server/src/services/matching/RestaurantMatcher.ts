/**
 * Restaurant Matching Utility
 * Matches restaurant names and branch addresses with normalization for punctuation, casing,
 * whitespace, and common abbreviations.
 */
export interface RestaurantMatchResult {
  isMatch: boolean;
  confidence: number;
  reason?: string;
}

export class RestaurantMatcher {
  private static readonly NOISE_WORDS = new Set([
    'the', 'restaurant', 'resturant', 'hotel', 'kitchen', 'kitchens', 'express', 'foods', 'food'
  ]);

  private static readonly COMMON_SPELLINGS: Record<string, string> = {
    'cafe': 'cafe',
    'café': 'cafe',
    'coffee': 'cafe',
    'bhavan': 'bhavan',
    'bhavana': 'bhavan',
    'bhavanam': 'bhavan',
    'darshini': 'darshini',
    'dharshini': 'darshini',
    'sweets': 'sweet',
    'sweet': 'sweet',
    'delight': 'delight',
    'delights': 'delight'
  };

  private static readonly KNOWN_LOCALITIES = [
    'indiranagar', 'jp nagar', 'koramangala', 'whitefield', 'hsr', 'hsr layout',
    'jayanagar', 'malleshwaram', 'marathahalli', 'bellandur', 'mg road', 'btm',
    'btm layout', 'hebbal', 'rajajinagar', 'electronic city', 'sarjapur', 'kalyan nagar'
  ];

  /**
   * Normalizes a string by lowercasing, stripping punctuation, and collapsing whitespace
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
   * Tokenizes and resolves common spelling variations
   */
  public static tokenize(text: string): string[] {
    const norm = RestaurantMatcher.normalize(text);
    if (!norm) return [];
    return norm
      .split(' ')
      .map(t => RestaurantMatcher.COMMON_SPELLINGS[t] || t)
      .filter(t => t.length > 0 && !RestaurantMatcher.NOISE_WORDS.has(t));
  }

  /**
   * Checks if two restaurant records represent the same establishment and outlet
   */
  public static matchRestaurants(
    restA: { name: string; address?: string },
    restB: { name: string; address?: string }
  ): RestaurantMatchResult {
    const tokensA = RestaurantMatcher.tokenize(restA.name);
    const tokensB = RestaurantMatcher.tokenize(restB.name);

    if (tokensA.length === 0 || tokensB.length === 0) {
      return { isMatch: false, confidence: 0, reason: 'Empty restaurant name' };
    }

    // Calculate token intersection for brand name
    const setB = new Set(tokensB);
    const intersection = tokensA.filter(t => setB.has(t));
    const tokenScore = (2 * intersection.length) / (tokensA.length + tokensB.length);

    // Exact or high brand token match
    const normA = RestaurantMatcher.normalize(restA.name);
    const normB = RestaurantMatcher.normalize(restB.name);
    const brandMatch = tokenScore >= 0.75 || normA === normB || normA.includes(normB) || normB.includes(normA);

    if (!brandMatch) {
      return {
        isMatch: false,
        confidence: tokenScore,
        reason: `Brand name mismatch: "${restA.name}" vs "${restB.name}"`
      };
    }

    // Branch / locality check if addresses are present
    const addrA = RestaurantMatcher.normalize(restA.address || '');
    const addrB = RestaurantMatcher.normalize(restB.address || '');

    if (addrA && addrB) {
      const areaA = RestaurantMatcher.KNOWN_LOCALITIES.find(loc => addrA.includes(loc));
      const areaB = RestaurantMatcher.KNOWN_LOCALITIES.find(loc => addrB.includes(loc));

      if (areaA && areaB && areaA !== areaB) {
        return {
          isMatch: false,
          confidence: 0.3,
          reason: `Branch mismatch: located in different areas ("${areaA}" vs "${areaB}")`
        };
      }
    }

    return {
      isMatch: true,
      confidence: Math.max(0.85, tokenScore),
      reason: 'Brand and branch match verified'
    };
  }
}

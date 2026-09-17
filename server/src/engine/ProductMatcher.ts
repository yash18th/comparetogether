export interface MatchCandidate {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  vegetarian: boolean;
  portionSize?: number;
  portionUnit?: string;
  restaurantId?: string;
  branchId?: string;
  branchArea?: string;
  variants?: string[];
  addons?: string[];
  isAvailable?: boolean;
}

export interface MatchResult {
  confidence: number; // 0.00 to 1.00
  isMatch: boolean;
  needsReview: boolean;
  matchedTokens: string[];
  reasons: string[];
}

export class ProductMatcher {
  private static STOP_WORDS = new Set([
    'special', 'deluxe', 'classic', 'chef', 'signature', 'authentic', 'traditional',
    'fresh', 'hot', 'style', 'plate', 'portion', 'best', 'original', 'tasty', 'delicious',
    'served', 'with', 'and', '&', 'the', 'a', 'an', 'in', 'of', 'for'
  ]);

  private static SYNONYMS: Record<string, string> = {
    'biriyani': 'biryani',
    'briyani': 'biryani',
    'dum biryani': 'biryani',
    'hyderabadi biryani': 'biryani',
    'pulao': 'pilaf',
    'dosa': 'dosai',
    'roti': 'chapati',
    'chiken': 'chicken',
    'chickn': 'chicken',
    'paneer': 'cottage cheese',
    'fries': 'french fries'
  };

  /**
   * Cleans, stems, and extracts significant tokens from an item name
   */
  public static tokenize(text: string): string[] {
    let cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    
    // Apply synonym replacements
    for (const [variant, standard] of Object.entries(ProductMatcher.SYNONYMS)) {
      if (cleaned.includes(variant)) {
        cleaned = cleaned.replace(new RegExp(`\\b${variant}\\b`, 'g'), standard);
      }
    }

    const tokens = cleaned
      .split(/\s+/)
      .filter(t => t.length > 1 && !ProductMatcher.STOP_WORDS.has(t));
    
    return Array.from(new Set(tokens));
  }

  /**
   * Calculates Sørensen–Dice coefficient on character bigrams (typo tolerance)
   */
  public static diceCoefficient(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const getBigrams = (str: string) => {
      const bigrams = new Map<string, number>();
      for (let i = 0; i < str.length - 1; i++) {
        const bigram = str.substring(i, i + 2);
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
      }
      return bigrams;
    };

    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    let intersection = 0;

    for (const [bigram, count1] of b1.entries()) {
      if (b2.has(bigram)) {
        intersection += Math.min(count1, b2.get(bigram)!);
      }
    }

    return (2.0 * intersection) / (s1.length - 1 + s2.length - 1);
  }

  /**
   * Compares two product candidates and generates a match confidence score
   */
  public static compare(source: MatchCandidate, target: MatchCandidate): MatchResult {
    const reasons: string[] = [];

    // HARD CONSTRAINT 1: Branch Isolation (Prices from different branches must never be combined)
    if (source.branchId && target.branchId && source.branchId !== target.branchId) {
      return {
        confidence: 0.0,
        isMatch: false,
        needsReview: false,
        matchedTokens: [],
        reasons: [`Branch isolation: Branch IDs do not match (${source.branchId} vs ${target.branchId})`]
      };
    }

    // HARD CONSTRAINT 2: Dietary mismatch (Veg vs Non-Veg is strictly incompatible)
    if (source.vegetarian !== target.vegetarian) {
      return {
        confidence: 0.0,
        isMatch: false,
        needsReview: false,
        matchedTokens: [],
        reasons: ['Hard mismatch: Dietary preference mismatch (Vegetarian vs Non-Vegetarian)']
      };
    }

    // Token analysis
    const sourceTokens = ProductMatcher.tokenize(source.name);
    const targetTokens = ProductMatcher.tokenize(target.name);
    const matchedTokens = sourceTokens.filter(t => targetTokens.includes(t));

    // Jaccard similarity of keywords
    const unionTokens = new Set([...sourceTokens, ...targetTokens]);
    const jaccardScore = unionTokens.size > 0 ? matchedTokens.length / unionTokens.size : 0;

    // String Dice similarity (handles minor typos)
    const diceScore = ProductMatcher.diceCoefficient(source.name, target.name);

    // Weighted Name Score
    let nameScore = (jaccardScore * 0.6) + (diceScore * 0.4);

    // Core keyword bonus: if all primary tokens of the shorter name are in the longer name
    const minTokens = Math.min(sourceTokens.length, targetTokens.length);
    if (minTokens > 0 && matchedTokens.length === minTokens) {
      nameScore = Math.min(1.0, nameScore + 0.20);
      reasons.push('Key dish noun phrase fully contained');
    }

    // Category check
    let categoryBonus = 0;
    if (source.category && target.category) {
      if (source.category.toLowerCase() === target.category.toLowerCase()) {
        categoryBonus = 0.10;
        reasons.push(`Category matches: ${source.category}`);
      } else {
        nameScore -= 0.15;
        reasons.push(`Category mismatch: ${source.category} vs ${target.category}`);
      }
    }

    // Portion Size check
    let portionPenalty = 0;
    if (source.portionSize && target.portionSize) {
      const ratio = source.portionSize / target.portionSize;
      if (ratio < 0.65 || ratio > 1.55) {
        portionPenalty = 0.30;
        reasons.push(`Significant portion size disparity: ${source.portionSize}g vs ${target.portionSize}g`);
      } else {
        reasons.push(`Portion sizes are compatible (${source.portionSize}g vs ${target.portionSize}g)`);
      }
    }

    // Variant compatibility (e.g. Half vs Full, Boneless vs Bone-in)
    const lowerSource = source.name.toLowerCase();
    const lowerTarget = target.name.toLowerCase();
    const variantKeywords = ['half', 'full', 'regular', 'large', 'boneless', 'with bone', 'single', 'double'];
    for (const vk of variantKeywords) {
      const sHas = lowerSource.includes(vk);
      const tHas = lowerTarget.includes(vk);
      if (sHas !== tHas) {
        nameScore -= 0.35;
        reasons.push(`Variant mismatch detected: "${vk}" only in one item`);
      }
    }

    const finalConfidence = Math.max(0.0, Math.min(1.0, nameScore + categoryBonus - portionPenalty));
    const roundedConfidence = Math.round(finalConfidence * 100) / 100;

    const isMatch = roundedConfidence >= 0.82;
    const needsReview = roundedConfidence >= 0.55 && roundedConfidence < 0.82;

    return {
      confidence: roundedConfidence,
      isMatch,
      needsReview,
      matchedTokens,
      reasons
    };
  }
}

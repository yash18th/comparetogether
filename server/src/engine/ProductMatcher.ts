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
  public static readonly MATCH_THRESHOLD = 0.85;
  public static readonly REVIEW_THRESHOLD = 0.60;

  private static STOP_WORDS = new Set([
    'special', 'deluxe', 'classic', 'chef', 'signature', 'authentic', 'traditional',
    'fresh', 'hot', 'style', 'plate', 'portion', 'best', 'original', 'tasty', 'delicious',
    'served', 'with', 'and', '&', 'the', 'a', 'an', 'in', 'of', 'for'
  ]);

  // Pure spelling variations only — NEVER culinary style or dish type replacements!
  private static SPELLING_SYNONYMS: Record<string, string> = {
    'biriyani': 'biryani',
    'briyani': 'biryani',
    'chiken': 'chicken',
    'chickn': 'chicken',
    'dosa': 'dosai',
    'roti': 'chapati',
    'paneer': 'cottage cheese'
  };

  // Distinct preparation styles that MUST NOT be conflated
  private static PREPARATION_STYLES = [
    'dum', 'hyderabadi', 'kacchi', 'fry', 'donne', 'roast', 'chettinad',
    'lucknowi', 'malabar', 'ambur', 'tandoori', 'tikka', 'butter masala',
    'kadai', 'handi', 'peri peri', 'masala', 'plain'
  ];

  // Variant modifiers that indicate different packaging or portioning tiers
  private static VARIANT_MODIFIERS = [
    'half', 'full', 'regular', 'large', 'small', 'boneless', 'with bone',
    'single', 'double', 'family', 'bucket', 'mini', 'jumbo'
  ];

  /**
   * Cleans and tokenizes text without conflating cooking styles
   */
  public static tokenize(text: string): string[] {
    let cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

    for (const [variant, standard] of Object.entries(ProductMatcher.SPELLING_SYNONYMS)) {
      cleaned = cleaned.replace(new RegExp(`\\b${variant}\\b`, 'g'), standard);
    }

    const tokens = cleaned
      .split(/\s+/)
      .filter(t => t.length > 1 && !ProductMatcher.STOP_WORDS.has(t));

    return Array.from(new Set(tokens));
  }

  /**
   * Calculates Sørensen–Dice coefficient on character bigrams for typo tolerance
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
   * Conservative comparison between two product candidates
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

    // HARD CONSTRAINT 2: Restaurant Identity Isolation (within same restaurant chain)
    if (source.restaurantId && target.restaurantId && source.restaurantId !== target.restaurantId) {
      reasons.push(`Cross-restaurant comparison: ${source.restaurantId} vs ${target.restaurantId}`);
    }

    // HARD CONSTRAINT 3: Dietary mismatch (Veg vs Non-Veg is strictly incompatible)
    if (source.vegetarian !== target.vegetarian) {
      return {
        confidence: 0.0,
        isMatch: false,
        needsReview: false,
        matchedTokens: [],
        reasons: ['Hard mismatch: Dietary preference mismatch (Vegetarian vs Non-Vegetarian)']
      };
    }

    const lowerSource = source.name.toLowerCase();
    const lowerTarget = target.name.toLowerCase();

    // Preparation style check (e.g. "Dum" vs "Hyderabadi" vs plain "Biryani")
    let preparationMismatch = false;
    for (const style of ProductMatcher.PREPARATION_STYLES) {
      const sHas = lowerSource.includes(style);
      const tHas = lowerTarget.includes(style);
      if (sHas !== tHas) {
        preparationMismatch = true;
        reasons.push(`Distinct preparation style detected: "${style}" present in only one dish`);
      }
    }

    // Variant modifier check (e.g. Half vs Full, Boneless vs With Bone)
    let variantMismatch = false;
    for (const vm of ProductMatcher.VARIANT_MODIFIERS) {
      const sHas = lowerSource.includes(vm);
      const tHas = lowerTarget.includes(vm);
      if (sHas !== tHas) {
        variantMismatch = true;
        reasons.push(`Variant mismatch detected: "${vm}" only in one item`);
      }
    }

    // Token analysis
    const sourceTokens = ProductMatcher.tokenize(source.name);
    const targetTokens = ProductMatcher.tokenize(target.name);
    const matchedTokens = sourceTokens.filter(t => targetTokens.includes(t));

    // Jaccard similarity
    const unionTokens = new Set([...sourceTokens, ...targetTokens]);
    const jaccardScore = unionTokens.size > 0 ? matchedTokens.length / unionTokens.size : 0;
    const diceScore = ProductMatcher.diceCoefficient(source.name, target.name);

    let nameScore = (jaccardScore * 0.5) + (diceScore * 0.5);

    // Penalize preparation mismatches heavily to prevent improper merging
    if (preparationMismatch) {
      nameScore -= 0.35;
    }

    // Penalize variant mismatches heavily
    if (variantMismatch) {
      nameScore -= 0.35;
    }

    // Category check
    let categoryBonus = 0;
    if (source.category && target.category) {
      if (source.category.toLowerCase() === target.category.toLowerCase()) {
        categoryBonus = 0.05;
        reasons.push(`Category matches: ${source.category}`);
      } else {
        nameScore -= 0.20;
        reasons.push(`Category mismatch: ${source.category} vs ${target.category}`);
      }
    }

    // Portion Size check
    let portionPenalty = 0;
    if (source.portionSize && target.portionSize) {
      const ratio = source.portionSize / target.portionSize;
      if (ratio < 0.70 || ratio > 1.40) {
        portionPenalty = 0.35;
        reasons.push(`Significant portion size disparity: ${source.portionSize}g vs ${target.portionSize}g`);
      } else {
        reasons.push(`Portion sizes are compatible (${source.portionSize}g vs ${target.portionSize}g)`);
      }
    }

    const finalConfidence = Math.max(0.0, Math.min(1.0, nameScore + categoryBonus - portionPenalty));
    const roundedConfidence = Math.round(finalConfidence * 100) / 100;

    const isMatch = roundedConfidence >= ProductMatcher.MATCH_THRESHOLD;
    const needsReview = roundedConfidence >= ProductMatcher.REVIEW_THRESHOLD && roundedConfidence < ProductMatcher.MATCH_THRESHOLD;

    return {
      confidence: roundedConfidence,
      isMatch,
      needsReview,
      matchedTokens,
      reasons
    };
  }

  /**
   * Strictly verifies whether two restaurant branches match.
   * Prevents matching different branches of the same chain (e.g., Nagarjuna Indiranagar vs Nagarjuna Koramangala).
   */
  public static matchRestaurantBranch(
    source: { name: string; branchName?: string; area?: string; city?: string; address?: string },
    target: { name: string; branchName?: string; area?: string; city?: string; address?: string }
  ): { confidence: number; isMatch: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // 1. City check
    if (source.city && target.city) {
      const sCity = source.city.trim().toLowerCase();
      const tCity = target.city.trim().toLowerCase();
      const sNormCity = sCity === 'bengaluru' ? 'bangalore' : sCity;
      const tNormCity = tCity === 'bengaluru' ? 'bangalore' : tCity;
      if (sNormCity !== tNormCity) {
        return {
          confidence: 0.0,
          isMatch: false,
          reasons: [`City mismatch: ${source.city} vs ${target.city}`]
        };
      }
    }

    // 2. Restaurant Brand / Name Check
    const sNameTokens = ProductMatcher.tokenize(source.name);
    const tNameTokens = ProductMatcher.tokenize(target.name);
    const nameOverlap = sNameTokens.filter(t => tNameTokens.includes(t));
    const nameDice = ProductMatcher.diceCoefficient(source.name, target.name);

    if (nameOverlap.length === 0 && nameDice < 0.70) {
      return {
        confidence: 0.0,
        isMatch: false,
        reasons: [`Restaurant brand mismatch: "${source.name}" vs "${target.name}"`]
      };
    }

    // 3. Branch / Locality / Area Isolation Check
    const sBranchStr = `${source.branchName || ''} ${source.area || ''} ${source.address || ''}`.toLowerCase();
    const tBranchStr = `${target.branchName || ''} ${target.area || ''} ${target.address || ''}`.toLowerCase();

    const sBranchTokens = ProductMatcher.tokenize(sBranchStr);
    const tBranchTokens = ProductMatcher.tokenize(tBranchStr);

    // If both specify branch/locality, ensure they do not conflict
    if (sBranchTokens.length > 0 && tBranchTokens.length > 0) {
      const branchOverlap = sBranchTokens.filter(t => tBranchTokens.includes(t));
      const branchDice = ProductMatcher.diceCoefficient(sBranchStr, tBranchStr);

      // Known distinct Bangalore areas that must never be merged
      const DISTINCT_AREAS = [
        'indiranagar', 'koramangala', 'whitefield', 'hsr', 'jayanagar', 'jp nagar',
        'bellandur', 'marathahalli', 'electronic city', 'mg road', 'lavelle road',
        'malleswaram', 'rajajinagar', 'sadashivanagar', 'frazer town', 'kalyan nagar',
        'kammanahalli', 'bannerghatta', 'sarjapur', 'yelahanka', 'hebbal'
      ];

      for (const area of DISTINCT_AREAS) {
        const sHas = sBranchStr.includes(area);
        const tHas = tBranchStr.includes(area);
        if (sHas !== tHas && (sHas || tHas)) {
          return {
            confidence: 0.0,
            isMatch: false,
            reasons: [`Strict branch area mismatch: "${area}" present in only one branch`]
          };
        }
      }

      if (branchOverlap.length === 0 && branchDice < 0.40) {
        return {
          confidence: 0.20,
          isMatch: false,
          reasons: [`Branch locality mismatch: "${sBranchStr.trim()}" vs "${tBranchStr.trim()}"`]
        };
      }
    }

    const confidence = Math.round(Math.max(nameDice, 0.85) * 100) / 100;
    return {
      confidence,
      isMatch: confidence >= 0.80,
      reasons: ['Restaurant brand and branch locality match verified']
    };
  }
}


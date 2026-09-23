/**
 * Matching Engine
 * Accurately determines whether food items represent the exact same dish or similar variants.
 * Uses Canonical Food identity, spelling synonyms, diet validation, and confidence scoring tiers:
 * - 0.95: Strong Match (exact canonical + variant + restaurant match)
 * - 0.80: Probable Match (minor spelling / naming variation)
 * - 0.55: Uncertain / Similar Item (show separately or as similar item, never blindly merged)
 * - <0.55: No Match (completely distinct items)
 */

import { CanonicalFoodEngine, CanonicalFoodItem } from './CanonicalFoodModel.js';
import { MatchCandidate, MatchResult, ProductMatcher } from './ProductMatcher.js';

export type MatchTier = 'STRONG_MATCH' | 'PROBABLE_MATCH' | 'UNCERTAIN' | 'NO_MATCH';

export interface EnhancedMatchResult extends MatchResult {
  tier: MatchTier;
  sourceCanonical: CanonicalFoodItem;
  targetCanonical: CanonicalFoodItem;
  isSameRestaurant: boolean;
  isSimilarItem: boolean;
}

export class MatchingEngine {
  public static readonly STRONG_MATCH_THRESHOLD = 0.95;
  public static readonly PROBABLE_MATCH_THRESHOLD = 0.80;
  public static readonly UNCERTAIN_THRESHOLD = 0.55;

  /**
   * Compares two food items with deep canonical inspection and strict variant isolation
   */
  public static compareItems(source: MatchCandidate, target: MatchCandidate): EnhancedMatchResult {
    const sourceCanonical = CanonicalFoodEngine.resolveCanonical(source.name, source.description, source.vegetarian);
    const targetCanonical = CanonicalFoodEngine.resolveCanonical(target.name, target.description, target.vegetarian);

    const reasons: string[] = [];

    // HARD RULE 1: Dietary mismatch (Veg vs Non-Veg cannot be the same dish)
    if (sourceCanonical.diet !== targetCanonical.diet || (source.vegetarian !== undefined && target.vegetarian !== undefined && source.vegetarian !== target.vegetarian)) {
      return {
        confidence: 0.0,
        isMatch: false,
        needsReview: false,
        matchedTokens: [],
        reasons: [`Hard dietary mismatch: ${sourceCanonical.diet} vs ${targetCanonical.diet}`],
        tier: 'NO_MATCH',
        sourceCanonical,
        targetCanonical,
        isSameRestaurant: source.restaurantId === target.restaurantId,
        isSimilarItem: false
      };
    }

    // HARD RULE 2: Variant mismatch (e.g. Masala Dosa vs Plain Dosa, Set Dosa, Rava Dosa)
    if (sourceCanonical.baseDish === targetCanonical.baseDish && sourceCanonical.variant !== targetCanonical.variant) {
      // They share base dish (e.g. Dosa or Biryani) but are different variants
      return {
        confidence: 0.55,
        isMatch: false,
        needsReview: true,
        matchedTokens: [sourceCanonical.baseDish],
        reasons: [`Variant distinction: "${sourceCanonical.variant}" vs "${targetCanonical.variant}" under base dish "${sourceCanonical.baseDish}"`],
        tier: 'UNCERTAIN',
        sourceCanonical,
        targetCanonical,
        isSameRestaurant: source.restaurantId === target.restaurantId,
        isSimilarItem: true
      };
    }

    // Delegate to token & Sørensen-Dice analysis
    const baseResult = ProductMatcher.compare(source, target);
    let confidence = baseResult.confidence;

    // Check if canonical names are identical (e.g., "Masala Dosa" and "Masala Dosai")
    if (sourceCanonical.canonicalName === targetCanonical.canonicalName) {
      if (confidence < 0.90) {
        confidence = Math.max(confidence, 0.92);
        reasons.push(`Canonical identity match: "${sourceCanonical.canonicalName}"`);
      }
    }

    const isSameRestaurant = Boolean(
      source.restaurantId && target.restaurantId && source.restaurantId === target.restaurantId
    );

    // Score tier assignment
    let tier: MatchTier = 'NO_MATCH';
    let isMatch = false;
    let isSimilar = false;

    if (confidence >= MatchingEngine.STRONG_MATCH_THRESHOLD) {
      tier = 'STRONG_MATCH';
      isMatch = true;
    } else if (confidence >= MatchingEngine.PROBABLE_MATCH_THRESHOLD) {
      tier = 'PROBABLE_MATCH';
      isMatch = true;
    } else if (confidence >= MatchingEngine.UNCERTAIN_THRESHOLD) {
      tier = 'UNCERTAIN';
      isMatch = false;
      isSimilar = true;
    } else {
      tier = 'NO_MATCH';
      isMatch = false;
    }

    return {
      confidence,
      isMatch,
      needsReview: tier === 'UNCERTAIN' || tier === 'PROBABLE_MATCH',
      matchedTokens: baseResult.matchedTokens,
      reasons: [...baseResult.reasons, ...reasons],
      tier,
      sourceCanonical,
      targetCanonical,
      isSameRestaurant,
      isSimilarItem: isSimilar
    };
  }

  /**
   * Helper to verify restaurant branch identity
   */
  public static matchRestaurantBranch = ProductMatcher.matchRestaurantBranch;
}

export { ProductMatcher };

import { CanonicalFoodEngine } from '../engine/CanonicalFoodModel.js';
import { ProductMatcher } from '../engine/ProductMatcher.js';
import { CanonicalFoodItem } from './NormalizationService.js';

export interface ItemMatchResult {
  isMatch: boolean;
  confidence: number;
  reasons: string[];
  isSameRestaurant: boolean;
}

export class MatchingService {
  /**
   * Deterministically matches restaurants considering branch locality
   * "Rameshwaram Cafe" vs "The Rameshwaram Cafe" matches if locality matches
   * But "Rameshwaram Cafe Indiranagar" vs "Rameshwaram Cafe JP Nagar" must NOT match as same outlet
   */
  public static matchRestaurants(
    restA: { name: string; location?: string; latitude?: number; longitude?: number },
    restB: { name: string; location?: string; latitude?: number; longitude?: number }
  ): { isMatch: boolean; confidence: number; reason: string } {
    const cleanA = CanonicalFoodEngine.normalizeString(restA.name).replace(/\bthe\b/g, '').trim();
    const cleanB = CanonicalFoodEngine.normalizeString(restB.name).replace(/\bthe\b/g, '').trim();

    // Check base brand match
    const dice = ProductMatcher.diceCoefficient(cleanA, cleanB);
    const brandMatches = dice >= 0.75 || cleanA.includes(cleanB) || cleanB.includes(cleanA);

    if (!brandMatches) {
      return { isMatch: false, confidence: dice, reason: `Brand mismatch: "${restA.name}" vs "${restB.name}"` };
    }

    // Check locality / branch distinction
    const locA = CanonicalFoodEngine.normalizeString(restA.location || '');
    const locB = CanonicalFoodEngine.normalizeString(restB.location || '');

    if (locA && locB) {
      const locDice = ProductMatcher.diceCoefficient(locA, locB);
      const knownAreas = ['indiranagar', 'jp nagar', 'koramangala', 'whitefield', 'hsr', 'jayanagar', 'malleshwaram', 'marathahalli', 'bellandur', 'mg road'];
      const areaA = knownAreas.find(a => locA.includes(a));
      const areaB = knownAreas.find(a => locB.includes(a));
      if (areaA && areaB && areaA !== areaB) {
        return {
          isMatch: false,
          confidence: 0.2,
          reason: `Branch mismatch: "${restA.location}" vs "${restB.location}" (different outlets: ${areaA} vs ${areaB})`
        };
      }

      if (locDice < 0.6) {
        return {
          isMatch: false,
          confidence: 0.3,
          reason: `Branch mismatch: "${restA.location}" vs "${restB.location}"`
        };
      }
    }

    // Check coordinate distance if both available
    if (restA.latitude && restA.longitude && restB.latitude && restB.longitude) {
      const distKm = MatchingService.calculateDistanceKm(
        restA.latitude,
        restA.longitude,
        restB.latitude,
        restB.longitude
      );
      if (distKm > 3.0) {
        return {
          isMatch: false,
          confidence: 0.2,
          reason: `Geographic distance mismatch: ${distKm.toFixed(1)}km apart`
        };
      }
    }

    return {
      isMatch: true,
      confidence: Math.max(0.85, dice),
      reason: `Brand and branch match confirmed`
    };
  }

  /**
   * Matches two canonical food items deterministically
   */
  public static matchItems(itemA: CanonicalFoodItem, itemB: CanonicalFoodItem): ItemMatchResult {
    const reasons: string[] = [];

    // 1. Dietary validation
    if (
      itemA.item.vegetarian !== null &&
      itemB.item.vegetarian !== null &&
      itemA.item.vegetarian !== itemB.item.vegetarian
    ) {
      return {
        isMatch: false,
        confidence: 0.0,
        reasons: ['Dietary conflict: vegetarian vs non-vegetarian'],
        isSameRestaurant: false
      };
    }

    // 2. Restaurant match
    const restMatch = MatchingService.matchRestaurants(itemA.restaurant, itemB.restaurant);
    if (!restMatch.isMatch) {
      reasons.push(restMatch.reason);
    }

    // 3. Canonical resolution for dishes
    const canonA = CanonicalFoodEngine.resolveCanonical(itemA.item.name, itemA.item.description, itemA.item.vegetarian ?? undefined);
    const canonB = CanonicalFoodEngine.resolveCanonical(itemB.item.name, itemB.item.description, itemB.item.vegetarian ?? undefined);

    // Hard rule: Variant distinction (Masala Dosa vs Plain Dosa or Cheese Masala Dosa)
    if (canonA.baseDish === canonB.baseDish && canonA.variant !== canonB.variant) {
      return {
        isMatch: false,
        confidence: 0.5,
        reasons: [`Variant mismatch: "${canonA.variant}" vs "${canonB.variant}" for base "${canonA.baseDish}"`],
        isSameRestaurant: restMatch.isMatch
      };
    }

    // 4. Token & string similarity
    const cleanNameA = CanonicalFoodEngine.normalizeString(itemA.item.name);
    const cleanNameB = CanonicalFoodEngine.normalizeString(itemB.item.name);
    const dice = ProductMatcher.diceCoefficient(cleanNameA, cleanNameB);

    let confidence = dice;
    if (canonA.canonicalName === canonB.canonicalName) {
      confidence = Math.max(confidence, 0.92);
      reasons.push(`Exact canonical dish match: "${canonA.canonicalName}"`);
    }

    const isMatch = confidence >= 0.80 && restMatch.isMatch;

    return {
      isMatch,
      confidence,
      reasons,
      isSameRestaurant: restMatch.isMatch
    };
  }

  /**
   * Haversine formula to compute distance in kilometers between two GPS coordinates
   */
  public static calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

/**
 * Verification test suite for Canonical Food Model, Matching Engine, and Price Engine
 */

import { CanonicalFoodEngine } from './engine/CanonicalFoodModel.js';
import { MatchingEngine } from './engine/MatchingEngine.js';
import { PriceEngine } from './engine/PriceEngine.js';

console.log('🧪 Starting Engine Unit Verification Tests...\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${testName}: ${detail}`);
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail}`);
    process.exit(1);
  }
}

// 1. Canonical Food Model: Masala Dosa vs Masala Dosai
const canonicalDosa1 = CanonicalFoodEngine.resolveCanonical('Masala Dosa');
const canonicalDosa2 = CanonicalFoodEngine.resolveCanonical('Masala Dosai');
assert(
  canonicalDosa1.canonicalName === 'masala dosa' && canonicalDosa2.canonicalName === 'masala dosa',
  'Canonical Dosa Match',
  `"Masala Dosa" and "Masala Dosai" both resolve to canonical "${canonicalDosa1.canonicalName}"`
);

// 2. Canonical Food Model: Plain Dosa
const canonicalPlainDosa = CanonicalFoodEngine.resolveCanonical('Plain Dosa');
assert(
  canonicalPlainDosa.canonicalName === 'plain dosa' && canonicalPlainDosa.variant === 'plain',
  'Plain Dosa Variant Isolation',
  `"Plain Dosa" resolves to variant "${canonicalPlainDosa.variant}" and canonical "${canonicalPlainDosa.canonicalName}"`
);

// 3. Matching Engine: Masala Dosa vs Masala Dosai (Same Restaurant)
const matchDosa = MatchingEngine.compareItems(
  { name: 'Masala Dosa', vegetarian: true, restaurantId: 'rest_rameshwaram' },
  { name: 'Masala Dosai', vegetarian: true, restaurantId: 'rest_rameshwaram' }
);
assert(
  matchDosa.isMatch && matchDosa.confidence >= 0.80,
  'Dosa Spelling Match',
  `"Masala Dosa" vs "Masala Dosai" matched with ${matchDosa.confidence} confidence (tier: ${matchDosa.tier})`
);

// 4. Matching Engine: Plain Dosa vs Masala Dosa (Must NOT merge!)
const matchPlainVsMasala = MatchingEngine.compareItems(
  { name: 'Plain Dosa', vegetarian: true, restaurantId: 'rest_rameshwaram' },
  { name: 'Masala Dosa', vegetarian: true, restaurantId: 'rest_rameshwaram' }
);
assert(
  !matchPlainVsMasala.isMatch && matchPlainVsMasala.isSimilarItem && matchPlainVsMasala.confidence === 0.55,
  'Plain Dosa vs Masala Dosa Variant Separation',
  `"Plain Dosa" vs "Masala Dosa" isolated with confidence ${matchPlainVsMasala.confidence} (tier: ${matchPlainVsMasala.tier}, isMatch: ${matchPlainVsMasala.isMatch})`
);

// 5. Matching Engine: Chicken Biryani vs Veg Biryani (Strict Diet Block)
const matchDietMismatch = MatchingEngine.compareItems(
  { name: 'Chicken Biryani', vegetarian: false, restaurantId: 'rest_meghana' },
  { name: 'Veg Biryani', vegetarian: true, restaurantId: 'rest_meghana' }
);
assert(
  !matchDietMismatch.isMatch && matchDietMismatch.confidence === 0.0,
  'Dietary Mismatch Hard Rejection',
  `"Chicken Biryani" vs "Veg Biryani" strictly rejected (confidence: ${matchDietMismatch.confidence}, tier: ${matchDietMismatch.tier})`
);

// 6. Price Engine: Incomplete Fee Components ('Not provided' transparency)
const incompletePrice = PriceEngine.calculate({
  itemPrice: 120,
  discount: 20,
  packagingFee: 5
  // delivery, platform, taxes not provided
});
assert(
  incompletePrice.deliveryFee.status === 'not_provided' &&
  incompletePrice.deliveryFee.formatted === 'Not provided' &&
  incompletePrice.effectivePrice === null &&
  !incompletePrice.isEffectivePriceComplete,
  'Price Engine Incomplete Transparency',
  `Unavailable delivery fee correctly reports "Not provided", effective price is null without inventing fees`
);

// 7. Price Engine: Complete Fee Components Calculation
const completePrice = PriceEngine.calculate({
  itemPrice: 120,
  discount: 20,
  packagingFee: 5,
  deliveryFee: 10,
  platformFee: 5,
  taxes: 5
});
// 120 - 20 + 5 + 10 + 5 + 5 = 125
assert(
  completePrice.menuPrice === 120 &&
  completePrice.effectivePrice === 125 &&
  completePrice.isEffectivePriceComplete,
  'Price Engine Complete Calculation',
  `Menu price ₹${completePrice.menuPrice} with discount ₹20 and fees (₹5+₹10+₹5+₹5) computes exact effective price ₹${completePrice.effectivePrice}`
);

console.log(`\n🎉 ALL ${passed}/${total} ENGINE UNIT TESTS PASSED SUCCESSFULLY!`);

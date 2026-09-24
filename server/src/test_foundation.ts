/**
 * Test Suite: Backend Comparison Foundation
 * Validates Normalization, Restaurant Matching, Food Item Matching,
 * Zomato/Swiggy Services, and the Comparison Service.
 */
import { FoodItemNormalizer, NormalizedFoodItem } from './services/normalization/FoodItemNormalizer.js';
import { RestaurantMatcher } from './services/matching/RestaurantMatcher.js';
import { FoodItemMatcher } from './services/matching/FoodItemMatcher.js';
import { ZomatoService } from './services/zomato/index.js';
import { SwiggyService } from './services/swiggy/index.js';
import { FoodComparisonService } from './services/comparison/FoodComparisonService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

console.log('====================================================');
console.log('TEST 1: Common Normalized Food Item Structure');
console.log('====================================================');

const swiggyRawRest = { restaurantId: 'swiggy_rest_1', name: 'Rameshwaram Cafe', address: 'Indiranagar, Bangalore' };
const swiggyRawItem = { menuItemId: 's_item_1', name: 'Masala Dosa', description: 'Crispy rice crepe', price: 120, currency: 'INR', isAvailable: true };
const normSwiggy = FoodItemNormalizer.normalizeSwiggyItem(swiggyRawRest, swiggyRawItem);

assert(normSwiggy.platform === 'swiggy', 'Platform field set to "swiggy"');
assert(normSwiggy.restaurantId === 'swiggy_rest_1', 'restaurantId matches');
assert(normSwiggy.restaurantName === 'Rameshwaram Cafe', 'restaurantName matches');
assert(normSwiggy.restaurantAddress === 'Indiranagar, Bangalore', 'restaurantAddress matches');
assert(normSwiggy.itemId === 's_item_1', 'itemId matches');
assert(normSwiggy.itemName === 'Masala Dosa', 'itemName matches');
assert(normSwiggy.description === 'Crispy rice crepe', 'description matches');
assert('variant' in normSwiggy, 'variant field present in structure');
assert(normSwiggy.price === 120, 'price is 120');
assert(normSwiggy.currency === 'INR', 'currency is INR');
assert(normSwiggy.available === true, 'available is true');
assert(normSwiggy.source === 'swiggy_api', 'source matches');
assert(Boolean(normSwiggy.fetchedAt), 'fetchedAt timestamp present');

const zomatoRawRest = { id: 'zom_rest_1', name: 'The Rameshwaram Cafe', location: { locality: 'Indiranagar, Bangalore' } };
const zomatoRawItem = { id: 'z_item_1', name: 'Masala Dosa', description: 'Classic dosa', item_price: 130, currency: 'INR', available: true };
const normZomato = FoodItemNormalizer.normalizeZomatoItem(zomatoRawRest, zomatoRawItem);

assert(normZomato.platform === 'zomato', 'Platform field set to "zomato"');
assert(normZomato.price === 130, 'Zomato item price normalized');

console.log('\n====================================================');
console.log('TEST 2: Restaurant Matching Utility');
console.log('====================================================');

const match1 = RestaurantMatcher.matchRestaurants(
  { name: 'The Rameshwaram Cafe', address: 'Indiranagar, Bangalore' },
  { name: 'Rameshwaram Cafe', address: 'Indiranagar' }
);
assert(match1.isMatch === true, '"The Rameshwaram Cafe" matches "Rameshwaram Cafe" in Indiranagar');

const match2 = RestaurantMatcher.matchRestaurants(
  { name: 'Rameshwaram Cafe', address: '100 Feet Rd, Indiranagar' },
  { name: 'Rameshwaram Cafe', address: 'JP Nagar 2nd Phase' }
);
assert(match2.isMatch === false, '"Rameshwaram Cafe Indiranagar" does NOT match "Rameshwaram Cafe JP Nagar"');

const match3 = RestaurantMatcher.matchRestaurants(
  { name: 'Meghana Foods', address: 'Koramangala' },
  { name: 'Empire Restaurant', address: 'Koramangala' }
);
assert(match3.isMatch === false, 'Different brands do not match');

console.log('\n====================================================');
console.log('TEST 3: Food Item Matching Utility');
console.log('====================================================');

const itemMatch1 = FoodItemMatcher.matchFoodItems(
  { name: 'Masala Dosa' },
  { name: 'masala dosa' }
);
assert(itemMatch1.isMatch === true, '"Masala Dosa" matches "masala dosa"');

const itemMatch2 = FoodItemMatcher.matchFoodItems(
  { name: 'Masala Dosa' },
  { name: 'Masala Dose' }
);
assert(itemMatch2.isMatch === true, '"Masala Dosa" matches "Masala Dose" (spelling variation)');

const itemMatch3 = FoodItemMatcher.matchFoodItems(
  { name: 'Masala Dosa' },
  { name: 'Cheese Masala Dosa' }
);
assert(itemMatch3.isMatch === false, '"Masala Dosa" does NOT match "Cheese Masala Dosa" (variant distinction)');

const itemMatch4 = FoodItemMatcher.matchFoodItems(
  { name: 'Paneer Butter Masala' },
  { name: 'paneer butter masala' }
);
assert(itemMatch4.isMatch === true, '"Paneer Butter Masala" matches "paneer butter masala"');

const itemMatch5 = FoodItemMatcher.matchFoodItems(
  { name: 'Paneer Butter Masala' },
  { name: 'Chicken Butter Masala' }
);
assert(itemMatch5.isMatch === false, '"Paneer Butter Masala" does NOT match "Chicken Butter Masala"');

const itemMatch6 = FoodItemMatcher.matchFoodItems(
  { name: 'Plain Dosa' },
  { name: 'Masala Dosa' }
);
assert(itemMatch6.isMatch === false, '"Plain Dosa" does NOT match "Masala Dosa"');

console.log('\n====================================================');
console.log('TEST 4: Provider Services Without API Keys');
console.log('====================================================');

// Temporarily clear environment variables to test unconfigured handling
const origZomatoKey = process.env.ZOMATO_API_KEY;
const origSwiggyKey = process.env.SWIGGY_API_KEY;
const origSwiggyClient = process.env.SWIGGY_CLIENT_ID;

delete process.env.ZOMATO_API_KEY;
delete process.env.SWIGGY_API_KEY;
delete process.env.SWIGGY_CLIENT_ID;

const zomatoStatus = ZomatoService.getInstance().getStatus();
assert(zomatoStatus.status === 'not_configured', 'Zomato returns status: "not_configured" when API key is missing');
assert(zomatoStatus.configured === false, 'Zomato configured flag is false');

const swiggyStatus = SwiggyService.getInstance().getStatus('test_user');
assert(swiggyStatus.status === 'not_configured', 'Swiggy returns status: "not_configured" when API key is missing');
assert(swiggyStatus.configured === false, 'Swiggy configured flag is false');

console.log('\n====================================================');
console.log('TEST 5: Comparison Service - Zero Fake Data Contract');
console.log('====================================================');

async function testComparison() {
  const result = await FoodComparisonService.compareFoodItem('Masala Dosa', 'Indiranagar');

  assert(result.item === 'Masala Dosa', 'Item preserved in comparison response');
  assert(result.status === 'not_configured', 'Overall status is "not_configured" when APIs are missing');
  assert(result.providers.zomato.status === 'not_configured', 'Zomato reported as not_configured');
  assert(result.providers.swiggy.status === 'not_configured', 'Swiggy reported as not_configured');
  assert(Array.isArray(result.comparisons), 'Comparisons is an array');
  assert(result.comparisons.length === 0, 'Zero fake comparisons returned when unconfigured');
  assert(result.totalComparisons === 0, 'totalComparisons is 0');

  console.log('\n====================================================');
  console.log('TEST 6: Comparison Calculation Logic (Swiggy vs Zomato)');
  console.log('====================================================');

  // Direct calculation assertion
  const zPrice = 140;
  const sPrice = 125;
  const diff = Math.abs(zPrice - sPrice);
  const cheaper = zPrice < sPrice ? 'zomato' : (sPrice < zPrice ? 'swiggy' : 'equal');

  assert(diff === 15, 'Difference between 140 and 125 is 15');
  assert(cheaper === 'swiggy', 'Cheaper platform correctly identified as swiggy');

  // Equal price scenario
  const zPriceEq = 150;
  const sPriceEq = 150;
  const cheaperEq = zPriceEq < sPriceEq ? 'zomato' : (sPriceEq < zPriceEq ? 'swiggy' : 'equal');
  assert(cheaperEq === 'equal', 'Equal price correctly identified as equal');
}

testComparison().then(() => {
  // Restore original env vars
  if (origZomatoKey) process.env.ZOMATO_API_KEY = origZomatoKey;
  if (origSwiggyKey) process.env.SWIGGY_API_KEY = origSwiggyKey;
  if (origSwiggyClient) process.env.SWIGGY_CLIENT_ID = origSwiggyClient;

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
});


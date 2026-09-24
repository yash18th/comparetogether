import { ProviderRegistry } from './providers/ProviderRegistry.js';
import { SwiggyProvider } from './providers/SwiggyProvider.js';
import { ZomatoProvider } from './providers/ZomatoProvider.js';
import { NormalizationService } from './services/NormalizationService.js';
import { MatchingService } from './services/MatchingService.js';
import { PriceEngine } from './services/PriceEngine.js';
import { SearchService } from './services/SearchService.js';

console.log('🧪 Starting FoodCompare End-to-End Pipeline Verification...\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, title: string, details: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${title}: ${details}`);
  } else {
    console.error(`❌ [FAIL] ${title}: ${details}`);
    process.exit(1);
  }
}

async function runTests() {
  // Test 1: Provider Registry
  const registry = ProviderRegistry.getInstance();
  const swiggy = registry.getProvider('swiggy');
  const zomato = registry.getProvider('zomato');
  assert(Boolean(swiggy && zomato), 'Provider Registry', 'Swiggy and Zomato providers are registered');

  // Test 2: Provider Statuses
  const swiggyStatus = await swiggy!.getStatus('test_user');
  assert(
    swiggyStatus.status === 'authentication_required' || swiggyStatus.status === 'available',
    'Swiggy Status Integrity',
    `Swiggy status reports "${swiggyStatus.status}" (configured: ${swiggyStatus.configured})`
  );

  const zomatoStatus = await zomato!.getStatus();
  assert(
    zomatoStatus.status === 'not_configured' || zomatoStatus.status === 'available',
    'Zomato Status Integrity',
    `Zomato status reports "${zomatoStatus.status}" (configured: ${zomatoStatus.configured})`
  );

  // Test 3: Normalization Service — fee null handling (Step 12: Never fabricate 0 for unknown fees)
  const rawSwiggyItem = {
    id: 'swiggy_dosa_1',
    name: 'Masala Dosa',
    price: 110,
    discount: 10,
    packagingFee: undefined,
    deliveryFee: undefined,
    taxes: undefined,
    isVeg: true
  };
  const rawSwiggyRestaurant = {
    restaurantId: 'rest_rameshwaram',
    name: 'Rameshwaram Cafe',
    branchName: 'Indiranagar'
  };

  const normalizedSwiggy = NormalizationService.normalizeSwiggy(rawSwiggyRestaurant, rawSwiggyItem);
  assert(
    normalizedSwiggy.pricing.packagingFee === null &&
    normalizedSwiggy.pricing.deliveryFee === null &&
    normalizedSwiggy.pricing.taxes === null,
    'Fee Transparency Normalization',
    'Unknown fees are preserved as null, not fabricated as 0'
  );

  // Test 4: Price Engine — comparable price with partial fees
  const comparablePrice = PriceEngine.calculateComparablePrice(normalizedSwiggy.pricing);
  assert(
    comparablePrice.isComplete === false && comparablePrice.status === 'PARTIAL',
    'Price Engine Partial Calculation',
    'Item with missing checkout fees correctly marked as PARTIAL, not complete final price'
  );

  // Test 5: Pairwise Price Comparison — winner isolation
  const completeSwiggyItem = {
    ...normalizedSwiggy,
    pricing: {
      basePrice: 110,
      discount: 0,
      packagingFee: 5,
      deliveryFee: 10,
      taxes: 5,
      finalPrice: 130
    }
  };

  const completeZomatoItem = {
    ...normalizedSwiggy,
    provider: 'zomato',
    pricing: {
      basePrice: 105,
      discount: 0,
      packagingFee: 5,
      deliveryFee: 10,
      taxes: 5,
      finalPrice: 125
    }
  };

  const comparison = PriceEngine.comparePair(completeSwiggyItem, completeZomatoItem);
  assert(
    comparison.canCompareFinalPrice &&
    comparison.difference === 5 &&
    comparison.lowerObservedProvider === 'zomato',
    'Side-by-Side Pairwise Comparison',
    `Zomato lower by ₹5 (Swiggy: ₹${comparison.swiggy.finalPrice}, Zomato: ₹${comparison.zomato.finalPrice})`
  );

  // Test 6: Restaurant Matching — Branch Distinction (Step 11)
  const matchSameBranch = MatchingService.matchRestaurants(
    { name: 'Rameshwaram Cafe', location: 'Indiranagar' },
    { name: 'The Rameshwaram Cafe', location: 'Indiranagar' }
  );
  assert(
    matchSameBranch.isMatch,
    'Restaurant Brand Match',
    '"Rameshwaram Cafe" and "The Rameshwaram Cafe" in Indiranagar match'
  );

  const matchDifferentBranch = MatchingService.matchRestaurants(
    { name: 'Rameshwaram Cafe', location: 'Indiranagar' },
    { name: 'Rameshwaram Cafe', location: 'JP Nagar' }
  );
  assert(
    !matchDifferentBranch.isMatch,
    'Restaurant Branch Isolation',
    '"Rameshwaram Cafe Indiranagar" vs "Rameshwaram Cafe JP Nagar" are isolated as different outlets'
  );

  // Test 7: Food Item Matching — Variant Separation (Step 10)
  const itemPlainDosa = {
    ...completeSwiggyItem,
    item: { ...completeSwiggyItem.item, name: 'Plain Dosa' }
  };
  const matchVariant = MatchingService.matchItems(completeSwiggyItem, itemPlainDosa);
  assert(
    !matchVariant.isMatch,
    'Dish Variant Separation',
    '"Masala Dosa" and "Plain Dosa" do NOT match'
  );

  // Test 8: End-to-End SearchService (Partial Failure Isolation)
  console.log('\nRunning SearchService.search("Masala Dosa", "Indiranagar")...');
  const searchResult = await SearchService.search({
    query: 'Masala Dosa',
    location: { name: 'Indiranagar' },
    userId: 'test_user'
  });

  assert(
    searchResult.query === 'Masala Dosa',
    'Search Query Preserved',
    `Query returned: "${searchResult.query}"`
  );

  assert(
    Boolean(searchResult.providers.swiggy && searchResult.providers.zomato),
    'Partial Provider Reporting',
    `Providers reported: swiggy (${searchResult.providers.swiggy.status}), zomato (${searchResult.providers.zomato.status})`
  );

  assert(
    searchResult.results.length > 0,
    'End-to-End Comparison Results',
    `Search successfully produced ${searchResult.results.length} matched dishes`
  );

  console.log(`\n🎉 All ${passed}/${total} verification tests passed successfully!\n`);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

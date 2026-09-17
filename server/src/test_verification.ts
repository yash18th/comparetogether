import { ProductMatcher } from './engine/ProductMatcher.js';
import { NormalizationEngine } from './engine/NormalizationEngine.js';
import { SearchEngine } from './engine/SearchEngine.js';
import { AdapterRegistry } from './adapters/AdapterRegistry.js';
import { initDatabase, db } from './db/database.js';

async function runVerification() {
  console.log('🧪 Starting FoodCompare End-to-End Automated Verification...\n');
  initDatabase();

  // Test 1: Typo tolerance & Search Engine
  console.log('1. Testing Typo-Tolerant Search:');
  const searchResults1 = SearchEngine.search({
    query: 'chiken biriyani',
    city: 'Bangalore',
    area: 'Indiranagar'
  });
  console.log(`- Query: "chiken biriyani" returned ${searchResults1.length} matches.`);
  if (searchResults1.length > 0 && searchResults1[0].product_name.includes('Biryani')) {
    console.log(`  ✅ Successfully resolved typo to "${searchResults1[0].product_name}" from ${searchResults1[0].restaurant_name} (${searchResults1[0].branch_area})`);
    console.log(`  ✅ Lowest Final Price: ₹${searchResults1[0].lowestFinalPrice} | Highest: ₹${searchResults1[0].highestFinalPrice} | Savings: ₹${searchResults1[0].maxSavings}`);
    console.log(`  ✅ Normalized Portion: ₹${searchResults1[0].pricePer100g}/100g`);
  } else {
    throw new Error('Typo search failed to match Biryani');
  }

  // Test 2: Restaurant Search
  console.log('\n2. Testing Restaurant Search:');
  const searchResults2 = SearchEngine.search({
    query: 'Empire',
    city: 'Bangalore'
  });
  console.log(`- Query: "Empire" returned ${searchResults2.length} dishes across Empire branches.`);
  if (searchResults2.length > 0 && searchResults2.every(r => r.restaurant_name === 'Empire Restaurant')) {
    console.log(`  ✅ All results accurately scoped to Empire branches`);
  } else {
    throw new Error('Restaurant search failed');
  }

  // Test 3: Partial Search ("biry")
  console.log('\n3. Testing Partial Search ("biry"):');
  const searchResults3 = SearchEngine.search({
    query: 'biry',
    city: 'Bangalore'
  });
  console.log(`- Query: "biry" returned ${searchResults3.length} dishes.`);
  if (searchResults3.length >= 3) {
    console.log(`  ✅ Partial prefix matched: ${searchResults3.map(s => s.product_name).slice(0, 3).join(', ')}`);
  } else {
    throw new Error('Partial search failed');
  }

  // Test 4: Product Matching Engine
  console.log('\n4. Testing Product Matching Engine:');
  // Match 1: Distinct preparation styles must NOT automatically merge
  const match1 = ProductMatcher.compare(
    { name: 'Chicken Dum Biryani', vegetarian: false, portionSize: 500, category: 'Biryani' },
    { name: 'Hyderabadi Chicken Biryani', vegetarian: false, portionSize: 500, category: 'Biryani' }
  );
  console.log(`- "Chicken Dum Biryani" vs "Hyderabadi Chicken Biryani": ${Math.round(match1.confidence * 100)}% Confidence (isMatch: ${match1.isMatch})`);
  if (match1.isMatch) throw new Error('Expected distinct preparation styles to NOT merge');

  // Match 1b: Identical dish with minor platform wording difference SHOULD match
  const match1b = ProductMatcher.compare(
    { name: 'Empire Special Chicken Biryani', vegetarian: false, portionSize: 500, category: 'Biryani' },
    { name: 'Empire Chicken Biryani', vegetarian: false, portionSize: 500, category: 'Biryani' }
  );
  console.log(`- "Empire Special Chicken Biryani" vs "Empire Chicken Biryani": ${Math.round(match1b.confidence * 100)}% Confidence (isMatch: ${match1b.isMatch})`);
  if (!match1b.isMatch) throw new Error('Expected identical dish wording to match');

  // Match 2: Veg Biryani vs Chicken Biryani (Hard dietary mismatch)
  const match2 = ProductMatcher.compare(
    { name: 'Veg Biryani', vegetarian: true, category: 'Biryani' },
    { name: 'Chicken Biryani', vegetarian: false, category: 'Biryani' }
  );
  console.log(`- "Veg Biryani" vs "Chicken Biryani": ${Math.round(match2.confidence * 100)}% Confidence (Hard dietary block: ${match2.reasons[0]})`);
  if (match2.confidence !== 0.0) throw new Error('Hard dietary mismatch failed');

  // Match 3: Portion disparity penalty (500g vs 1200g family pack)
  const match3 = ProductMatcher.compare(
    { name: 'Chicken Biryani', vegetarian: false, portionSize: 500, category: 'Biryani' },
    { name: 'Chicken Biryani Family Pack', vegetarian: false, portionSize: 1200, category: 'Biryani' }
  );
  console.log(`- Single vs Family pack disparity: ${Math.round(match3.confidence * 100)}% Confidence (isMatch: ${match3.isMatch})`);
  if (match3.isMatch) throw new Error('Single vs Family pack should not auto-match');

  // Test 5: Platform Adapter Registry
  console.log('\n5. Testing Platform Adapter Registry:');
  const registry = AdapterRegistry.getInstance();
  const adapters = registry.getAllAdapters();
  console.log(`- Registered Adapters: ${adapters.map(a => `${a.metadata.name} (${a.metadata.integrationStatus})`).join(', ')}`);
  if (adapters.length < 4) throw new Error('Missing required platform adapters');

  // Test 6: Pricing Normalization & Savings Calculation
  console.log('\n6. Testing Normalization Engine & Savings Logic:');
  const zomatoPricing = registry.getAdapter('zomato')!.calculatePricing({ itemPrice: 220, distanceKm: 3.2 }, 'empire', 'biryani');
  const swiggyPricing = registry.getAdapter('swiggy')!.calculatePricing({ itemPrice: 210, distanceKm: 3.2 }, 'empire', 'biryani');
  const eatclubPricing = registry.getAdapter('eatclub')!.calculatePricing({ itemPrice: 215 }, 'empire', 'biryani');

  console.log(`- Zomato: Item ₹${zomatoPricing.itemPrice}, Del ₹${zomatoPricing.deliveryFee}, Plat ₹${zomatoPricing.platformFee}, Tax ₹${zomatoPricing.taxes}, Disc ₹${zomatoPricing.discount} -> Final Payable: ₹${zomatoPricing.finalPrice}`);
  console.log(`- Swiggy: Item ₹${swiggyPricing.itemPrice}, Del ₹${swiggyPricing.deliveryFee}, Plat ₹${swiggyPricing.platformFee}, Tax ₹${swiggyPricing.taxes}, Disc ₹${swiggyPricing.discount} -> Final Payable: ₹${swiggyPricing.finalPrice}`);
  console.log(`- EatClub: Item ₹${eatclubPricing.itemPrice}, Del ₹${eatclubPricing.deliveryFee}, Plat ₹${eatclubPricing.platformFee}, Tax ₹${eatclubPricing.taxes}, Disc ₹${eatclubPricing.discount} -> Final Payable: ₹${eatclubPricing.finalPrice}`);

  const summary = NormalizationEngine.comparePlatforms(
    'p1', 'Chicken Biryani', 'Empire', 'Indiranagar', 'Indiranagar', 500, 'g',
    [zomatoPricing, swiggyPricing, eatclubPricing]
  );
  console.log(`  ✅ Cheapest Platform: ${summary.cheapestPlatformCode.toUpperCase()} at ₹${summary.cheapestFinalPrice}`);
  console.log(`  ✅ Highest Total: ₹${summary.highestFinalPrice}`);
  console.log(`  ✅ Savings Statement: "${summary.savingsText}"`);
  console.log(`  ✅ Portion Metric: ₹${summary.portionComparison?.cheapestPer100g} / 100g`);

  // Test 7: Branch Isolation in Product Matching
  console.log('\n7. Testing Strict Branch Isolation:');
  const branchMatch1 = ProductMatcher.compare(
    { name: 'Chicken Biryani', vegetarian: false, branchId: 'branch_indiranagar', category: 'Biryani' },
    { name: 'Chicken Biryani', vegetarian: false, branchId: 'branch_koramangala', category: 'Biryani' }
  );
  console.log(`- Identical dish across different branches: ${branchMatch1.confidence * 100}% Confidence (isMatch: ${branchMatch1.isMatch})`);
  if (branchMatch1.confidence !== 0.0 || branchMatch1.isMatch) {
    throw new Error('Branch isolation failed: dishes from different branches must not be merged!');
  }
  console.log(`  ✅ Correctly isolated: ${branchMatch1.reasons[0]}`);

  // Test 8: Swiggy MCP OAuth 2.1 + PKCE Generation
  console.log('\n8. Testing Swiggy MCP OAuth 2.1 + PKCE Engine:');
  const { SwiggyMcpClient } = await import('./services/SwiggyMcpClient.js');
  const swiggyClient = SwiggyMcpClient.getInstance();
  const pkce = swiggyClient.generatePkce();
  console.log(`- Generated code_verifier length: ${pkce.codeVerifier.length} chars (valid PKCE: ${pkce.codeVerifier.length >= 43})`);
  console.log(`- Generated code_challenge (S256 base64url): ${pkce.codeChallenge}`);
  if (pkce.codeVerifier.length < 43 || !pkce.codeChallenge) {
    throw new Error('Invalid PKCE parameters generated');
  }
  console.log('  ✅ PKCE Code Verifier & Challenge generation verified');

  // Test 9: Swiggy OAuth State & CSRF Protection
  console.log('\n9. Testing Swiggy OAuth State & Callback Validation:');
  const authUrlData = swiggyClient.createAuthorizationUrl();
  console.log(`- Created authUrl: ${authUrlData.authUrl.substring(0, 75)}...`);
  console.log(`- Generated state: ${authUrlData.state}`);
  
  // Verify invalid state is rejected
  let stateRejected = false;
  try {
    await swiggyClient.handleCallback('dummy_code', 'wrong_state_123');
  } catch (err: any) {
    stateRejected = err.message.includes('state validation mismatch');
  }
  if (!stateRejected) throw new Error('Failed to reject mismatched OAuth state');
  console.log('  ✅ CSRF State validation correctly rejected invalid state');

  // Test 10: Swiggy Provenance & Transparent Pricing
  console.log('\n10. Testing Swiggy Adapter Truthful Provenance:');
  const swiggyAdapter = registry.getAdapter('swiggy')!;
  const unauthSwiggyPrice = swiggyAdapter.calculatePricing({ itemPrice: 220, userId: 'unconnected_user' }, 'empire', 'biryani');
  console.log(`- Data Provenance: ${unauthSwiggyPrice.dataProvenance}`);
  console.log(`- Final Price Unavailable: ${unauthSwiggyPrice.finalPriceUnavailable}`);
  console.log(`- Unavailability Reason: "${unauthSwiggyPrice.unavailabilityReason}"`);
  if (!unauthSwiggyPrice.finalPriceUnavailable || (unauthSwiggyPrice.dataProvenance !== 'AUTH_REQUIRED' && unauthSwiggyPrice.dataProvenance !== 'INTEGRATION_PENDING')) {
    throw new Error('Swiggy must report AUTH_REQUIRED/INTEGRATION_PENDING and finalPriceUnavailable when disconnected!');
  }
  console.log('  ✅ Swiggy truthfully reports AUTH_REQUIRED without inventing fake delivery fees');

  console.log('\n🎉 ALL 10 VERIFICATION TEST SUITES PASSED FLAWLESSLY!');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

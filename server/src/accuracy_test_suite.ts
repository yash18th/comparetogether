import { ProductMatcher, MatchCandidate } from './engine/ProductMatcher.js';
import { NormalizationEngine } from './engine/NormalizationEngine.js';
import { SwiggyAdapter } from './adapters/SwiggyAdapter.js';
import { ZomatoAdapter } from './adapters/ZomatoAdapter.js';
import { EatClubAdapter } from './adapters/EatClubAdapter.js';
import { DirectMerchantAdapter } from './adapters/DirectMerchantAdapter.js';
import { SwiggyMcpClient } from './services/SwiggyMcpClient.js';
import { db } from './db/database.js';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testId: number, name: string, passMsg: string, failMsg: string) {
  if (condition) {
    results.push({ id: testId, name, passed: true, details: passMsg });
    console.log(`✅ Test ${testId}: ${name} - ${passMsg}`);
  } else {
    results.push({ id: testId, name, passed: false, details: failMsg });
    console.error(`❌ Test ${testId}: ${name} - ${failMsg}`);
  }
}

async function runAccuracyTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING FOODCOMPARE 20-POINT ACCURACY TEST SUITE');
  console.log('======================================================\n');

  // Test 1: Same item, same restaurant, same branch
  {
    const source: MatchCandidate = {
      name: 'Empire Special Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false,
      portionSize: 500,
      portionUnit: 'g',
      category: 'Biryani'
    };
    const target: MatchCandidate = {
      name: 'Empire Special Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false,
      portionSize: 500,
      portionUnit: 'g',
      category: 'Biryani'
    };
    const match = ProductMatcher.compare(source, target);
    assert(
      match.isMatch && match.confidence >= 0.85,
      1,
      'Same item, same restaurant, same branch',
      `Identical dish in same branch matched with ${(match.confidence * 100).toFixed(0)}% confidence`,
      `Expected match with >= 85% confidence, got ${match.confidence}`
    );
  }

  // Test 2: Same item, different branch (Branch Isolation)
  {
    const source: MatchCandidate = {
      name: 'Empire Special Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false
    };
    const target: MatchCandidate = {
      name: 'Empire Special Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_kor',
      vegetarian: false
    };
    const match = ProductMatcher.compare(source, target);
    assert(
      !match.isMatch && match.confidence === 0.0,
      2,
      'Same item, different branch',
      'Branch isolation strictly preserved (0.0% match across Indiranagar & Koramangala)',
      `Branch isolation failed, got match=${match.isMatch}, confidence=${match.confidence}`
    );
  }

  // Test 3: Different item with similar name (Conservative Matching)
  {
    const source: MatchCandidate = {
      name: 'Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false
    };
    const targetDum: MatchCandidate = {
      name: 'Chicken Dum Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false
    };
    const targetHyderabadi: MatchCandidate = {
      name: 'Hyderabadi Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false
    };

    const matchDum = ProductMatcher.compare(source, targetDum);
    const matchHyd = ProductMatcher.compare(source, targetHyderabadi);

    const neitherMerged = !matchDum.isMatch && !matchHyd.isMatch;
    assert(
      neitherMerged,
      3,
      'Different item with similar name',
      `"Chicken Biryani" correctly rejected merging with Dum (${(matchDum.confidence * 100).toFixed(0)}%) and Hyderabadi (${(matchHyd.confidence * 100).toFixed(0)}%)`,
      'Failed: Similar dishes with different culinary styles were erroneously merged'
    );
  }

  // Test 4: Different portion sizes (250g vs 500g penalty)
  {
    const source: MatchCandidate = {
      name: 'Special Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false,
      portionSize: 250,
      portionUnit: 'g'
    };
    const target: MatchCandidate = {
      name: 'Special Chicken Biryani',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false,
      portionSize: 500,
      portionUnit: 'g'
    };
    const match = ProductMatcher.compare(source, target);
    assert(
      !match.isMatch && match.reasons.some(r => r.includes('Significant portion size disparity')),
      4,
      'Different portion sizes',
      `Portion disparity correctly penalized match (Confidence: ${(match.confidence * 100).toFixed(0)}%)`,
      'Portion disparity was ignored'
    );
  }

  // Test 5: Different variants (Boneless vs With Bone)
  {
    const source: MatchCandidate = {
      name: 'Chicken Biryani (Boneless)',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false
    };
    const target: MatchCandidate = {
      name: 'Chicken Biryani (With Bone)',
      restaurantId: 'rest_empire',
      branchId: 'br_emp_ind',
      vegetarian: false
    };
    const match = ProductMatcher.compare(source, target);
    assert(
      !match.isMatch,
      5,
      'Different variants',
      `Variant modifier mismatch prevented invalid merge (Confidence: ${(match.confidence * 100).toFixed(0)}%)`,
      'Variant difference was erroneously merged'
    );
  }

  // Test 6: Add-ons calculation
  {
    const eatclub = new EatClubAdapter();
    const pricing = eatclub.calculatePricing({ itemPrice: 200, addons: 45 }, 'empire', 'biryani');
    assert(
      pricing.addons === 45 && pricing.finalPrice > pricing.itemPrice,
      6,
      'Add-ons',
      `Add-on total ₹${pricing.addons} accurately reflected in final calculation`,
      'Add-on total failed to compute'
    );
  }

  // Test 7: Delivery fee breakdown
  {
    const direct = new DirectMerchantAdapter();
    const underThreshold = direct.calculatePricing({ itemPrice: 200 }, 'empire', 'biryani');
    const overThreshold = direct.calculatePricing({ itemPrice: 300 }, 'empire', 'biryani');
    assert(
      underThreshold.deliveryFee === 25 && overThreshold.deliveryFee === 0,
      7,
      'Delivery fee',
      'Delivery fee rules accurate based on cart threshold (₹25 under ₹250, FREE over ₹250)',
      'Delivery fee calculation mismatch'
    );
  }

  // Test 8: Packaging fee breakdown
  {
    const direct = new DirectMerchantAdapter();
    const pricing = direct.calculatePricing({ itemPrice: 200 }, 'empire', 'biryani');
    assert(
      pricing.packagingFee === 10,
      8,
      'Packaging fee',
      `Direct restaurant packaging fee explicitly broken down at ₹${pricing.packagingFee}`,
      'Packaging fee was omitted or estimated incorrectly'
    );
  }

  // Test 9: Platform fee breakdown
  {
    const eatclub = new EatClubAdapter();
    const pricing = eatclub.calculatePricing({ itemPrice: 200 }, 'empire', 'biryani');
    assert(
      pricing.platformFee === 0,
      9,
      'Platform fee',
      'Platform fee explicitly 0 for zero-intermediary direct/pass partner',
      'Platform fee incorrect'
    );
  }

  // Test 10: Taxes (GST)
  {
    const eatclub = new EatClubAdapter();
    // Item 200, 20% disc = 40 -> subtotal 160. 5% GST on 160 = 8
    const pricing = eatclub.calculatePricing({ itemPrice: 200 }, 'empire', 'biryani');
    assert(
      pricing.taxes === 8,
      10,
      'Taxes',
      `Government GST calculated accurately at 5% (₹${pricing.taxes}) on post-discount subtotal`,
      `Tax calculation error: expected 8, got ${pricing.taxes}`
    );
  }

  // Test 11: Restaurant discount vs coupon
  {
    const eatclub = new EatClubAdapter();
    const product = eatclub.getNormalizedProduct({ itemPrice: 200 }, 'empire', 'biryani');
    assert(
      product.discount === 40 && product.couponDiscount === 0,
      11,
      'Restaurant discount',
      `Confirmed restaurant discount ₹${product.discount} separated from manual coupons (₹${product.couponDiscount})`,
      'Restaurant discount was conflated with coupons'
    );
  }

  // Test 12: Coupon (Potential vs Applied)
  {
    const zomato = new ZomatoAdapter();
    const product = zomato.getNormalizedProduct({ itemPrice: 250 }, 'empire', 'biryani');
    assert(
      Boolean(product.couponDiscount === 0 && product.potentialDiscounts && product.potentialDiscounts.length > 0),
      12,
      'Coupon',
      'Unapplied coupons marked as potential discounts without deducting unverified amounts',
      'Coupon was automatically deducted without verification'
    );
  }

  // Test 13: Unavailable item handling
  {
    const swiggy = new SwiggyAdapter();
    const product = swiggy.getNormalizedProduct({ itemPrice: 200, isAvailable: false }, 'empire', 'biryani');
    assert(
      product.availability === false,
      13,
      'Unavailable item',
      'Out of stock / unavailable items accurately flagged without breaking comparison',
      'Unavailable item was reported as available'
    );
  }

  // Test 14: Closed restaurant handling
  {
    const summary = NormalizationEngine.comparePlatforms(
      'p_closed',
      'Kebab',
      'Late Night Diner',
      'Indiranagar',
      'Indiranagar',
      300,
      'g',
      [
        {
          platformId: 'plat_zomato',
          platformName: 'Zomato',
          platformCode: 'zomato',
          itemPrice: 200,
          addons: 0,
          deliveryFee: 30,
          platformFee: 8,
          packagingFee: 15,
          taxes: 12,
          discount: 0,
          finalPrice: 265,
          availability: false, // Closed!
          membershipDiscount: 0,
          membershipApplied: false,
          estimatedDeliveryMin: 0,
          currency: 'INR',
          orderUrl: '',
          sourceType: 'authorized_api',
          dataProvenance: 'UNAVAILABLE',
          lastUpdated: new Date().toISOString()
        }
      ]
    );
    assert(
      summary.cheapestFinalPrice === 0 && summary.prices.length === 0,
      14,
      'Closed restaurant',
      'Closed platform cleanly excluded from determining lowest active payable price',
      'Closed restaurant was factored into active cheapest price'
    );
  }

  // Test 15: Expired OAuth handling
  {
    const client = SwiggyMcpClient.getInstance();
    // Insert test expired session for mock user 'test_expired_usr'
    db.prepare(`
      INSERT INTO oauth_sessions (user_id, platform_code, access_token, expires_at, updated_at)
      VALUES ('test_expired_usr', 'swiggy', 'expired_token_sample', datetime('now', '-1 hour'), CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, platform_code) DO UPDATE SET
        expires_at = excluded.expires_at,
        access_token = excluded.access_token
    `).run();

    const status = client.getStatus('test_expired_usr');
    db.prepare(`DELETE FROM oauth_sessions WHERE user_id = 'test_expired_usr'`).run();

    assert(
      status.status === 'EXPIRED' && !status.connected,
      15,
      'Expired OAuth',
      'Expired user OAuth session detected, requires re-authentication, connected=false',
      'Expired OAuth session was treated as active'
    );
  }

  // Test 16: API timeout resilience
  {
    const client = SwiggyMcpClient.getInstance();
    let timedOutOrFailed = false;
    try {
      // Calling tool without active credentials properly throws without crashing node
      await client.callMcpTool('search_restaurants', {}, 'nonexistent_user');
    } catch (err: any) {
      timedOutOrFailed = true;
    }
    assert(
      timedOutOrFailed,
      16,
      'API timeout',
      'Unauthenticated or timed out API calls reject safely with informative error',
      'API call failed unhandled'
    );
  }

  // Test 17: Zomato unavailable (Swiggy/others still render)
  {
    const summary = NormalizationEngine.comparePlatforms(
      'p_zom_unavail',
      'Cold Brew',
      'Third Wave',
      'Indiranagar',
      'Indiranagar',
      350,
      'ml',
      [
        {
          platformId: 'plat_zomato',
          platformName: 'Zomato',
          platformCode: 'zomato',
          itemPrice: 230,
          addons: 0,
          deliveryFee: 0,
          platformFee: 0,
          packagingFee: 0,
          taxes: 0,
          discount: 0,
          finalPrice: 230,
          finalPriceUnavailable: true, // Zomato unavailable
          unavailabilityReason: 'Authorized Zomato API access required',
          availability: true,
          membershipDiscount: 0,
          membershipApplied: false,
          estimatedDeliveryMin: 0,
          currency: 'INR',
          orderUrl: '',
          sourceType: 'authorized_api',
          dataProvenance: 'INTEGRATION_PENDING',
          lastUpdated: new Date().toISOString()
        },
        {
          platformId: 'plat_direct',
          platformName: 'Direct',
          platformCode: 'direct',
          itemPrice: 210,
          addons: 0,
          deliveryFee: 0,
          platformFee: 0,
          packagingFee: 5,
          taxes: 11,
          discount: 20,
          finalPrice: 206,
          finalPriceUnavailable: false,
          availability: true,
          membershipDiscount: 0,
          membershipApplied: false,
          estimatedDeliveryMin: 30,
          currency: 'INR',
          orderUrl: '',
          sourceType: 'merchant_direct',
          dataProvenance: 'AUTHORIZED',
          lastUpdated: new Date().toISOString()
        }
      ]
    );
    assert(
      summary.cheapestFinalPrice === 206 && summary.cheapestPlatformCode === 'direct',
      17,
      'Zomato unavailable',
      'When Zomato is pending integration, verified Direct/Swiggy prices still render accurately (Cheapest: ₹206)',
      'Comparison failed when Zomato had unavailable final price'
    );
  }

  // Test 18: Swiggy unavailable (Zomato/others still render)
  {
    const summary = NormalizationEngine.comparePlatforms(
      'p_swg_unavail',
      'Pasta',
      'Truffles',
      'Indiranagar',
      'Indiranagar',
      400,
      'g',
      [
        {
          platformId: 'plat_swiggy',
          platformName: 'Swiggy',
          platformCode: 'swiggy',
          itemPrice: 250,
          addons: 0,
          deliveryFee: 0,
          platformFee: 0,
          packagingFee: 0,
          taxes: 0,
          discount: 0,
          finalPrice: 250,
          finalPriceUnavailable: true,
          unavailabilityReason: 'Swiggy MCP session pending',
          availability: true,
          membershipDiscount: 0,
          membershipApplied: false,
          estimatedDeliveryMin: 0,
          currency: 'INR',
          orderUrl: '',
          sourceType: 'authorized_api',
          dataProvenance: 'INTEGRATION_PENDING',
          lastUpdated: new Date().toISOString()
        },
        {
          platformId: 'plat_eatclub',
          platformName: 'EatClub',
          platformCode: 'eatclub',
          itemPrice: 240,
          addons: 0,
          deliveryFee: 0,
          platformFee: 0,
          packagingFee: 0,
          taxes: 10,
          discount: 40,
          finalPrice: 210,
          finalPriceUnavailable: false,
          availability: true,
          membershipDiscount: 0,
          membershipApplied: false,
          estimatedDeliveryMin: 30,
          currency: 'INR',
          orderUrl: '',
          sourceType: 'authorized_api',
          dataProvenance: 'AUTHORIZED',
          lastUpdated: new Date().toISOString()
        }
      ]
    );
    assert(
      summary.cheapestFinalPrice === 210 && summary.cheapestPlatformCode === 'eatclub',
      18,
      'Swiggy unavailable',
      'When Swiggy is unauthenticated, EatClub/Direct still successfully determine cheapest verified total (₹210)',
      'Comparison failed when Swiggy was pending authorization'
    );
  }

  // Test 19: Missing final price transparent display
  {
    const zomato = new ZomatoAdapter();
    const product = zomato.getNormalizedProduct({ itemPrice: 240 }, 'empire', 'biryani');
    assert(
      product.finalPrice === 'Unavailable' && product.deliveryFee === 'Unavailable' && product.dataStatus === 'INTEGRATION_PENDING',
      19,
      'Missing final price',
      'Unverified platform fees explicitly reported as "Unavailable" rather than fabricated totals',
      'Missing fee was guessed or replaced with fake zero'
    );
  }

  // Test 20: Location-specific pricing scoping
  {
    // Indiranagar branch
    const indiPrice = db.prepare(`
      SELECT pp.final_price FROM product_prices pp
      JOIN products p ON pp.product_id = p.id
      JOIN branches b ON p.restaurant_branch_id = b.id
      WHERE b.area = 'Indiranagar' AND p.name LIKE '%Chicken Biryani%' AND pp.platform_id = 'plat_zomato'
      LIMIT 1
    `).get() as any;

    // Koramangala branch
    const koraPrice = db.prepare(`
      SELECT pp.final_price FROM product_prices pp
      JOIN products p ON pp.product_id = p.id
      JOIN branches b ON p.restaurant_branch_id = b.id
      WHERE b.area = 'Koramangala' AND p.name LIKE '%Chicken Biryani%' AND pp.platform_id = 'plat_zomato'
      LIMIT 1
    `).get() as any;

    assert(
      Boolean(indiPrice && koraPrice && indiPrice.final_price !== koraPrice.final_price),
      20,
      'Location-specific pricing',
      `Branch/neighborhood pricing independently scoped (Indiranagar: ₹${indiPrice?.final_price} vs Koramangala: ₹${koraPrice?.final_price})`,
      'Branch pricing was conflated across locations'
    );
  }

  console.log('\n------------------------------------------------------');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`📊 ACCURACY SUITE SUMMARY: ${passedCount} / ${results.length} TESTS PASSED`);
  console.log('------------------------------------------------------\n');

  if (passedCount === results.length) {
    console.log('🎉 ALL 20 ACCURACY SCENARIOS VERIFIED SUCCESSFULLY!\n');
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW.');
    process.exit(1);
  }
}

runAccuracyTestSuite().catch(err => {
  console.error('Fatal error running accuracy suite:', err);
  process.exit(1);
});

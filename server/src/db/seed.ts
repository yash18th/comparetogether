import { db, initDatabase } from './database.js';
import bcrypt from 'bcryptjs';

export function seedDatabase() {
  initDatabase();

  console.log('🌱 Checking seed data...');
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
  if (userCount > 0) {
    console.log(`⚡ Database already seeded with ${userCount} users. Preserving existing user data and records.`);
    return;
  }

  console.log('🌱 Seeding initial database records...');
  // Clear existing tables for fresh pristine initial seed
  db.exec(`
    DELETE FROM price_alerts;
    DELETE FROM favorites;
    DELETE FROM favorite_restaurants;
    DELETE FROM search_history;
    DELETE FROM price_history;
    DELETE FROM product_matches;
    DELETE FROM product_prices;
    DELETE FROM products;
    DELETE FROM branches;
    DELETE FROM restaurants;
    DELETE FROM platforms;
    DELETE FROM users;
  `);

  // 1. Users
  const passwordHash = bcrypt.hashSync('password123', 10);
  const adminHash = bcrypt.hashSync('admin123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('usr_admin', 'System Admin', 'admin@foodcompare.com', adminHash, 'admin');
  insertUser.run('usr_demo', 'Yashvanth S', 'user@foodcompare.com', passwordHash, 'user');

  // 2. Platforms
  const insertPlatform = db.prepare(`
    INSERT INTO platforms (id, name, code, logo_url, integration_status, is_official)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertPlatform.run('plat_zomato', 'Zomato', 'zomato', 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=80&h=80&fit=crop', 'authorized', 1);
  insertPlatform.run('plat_swiggy', 'Swiggy', 'swiggy', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=80&fit=crop', 'authorized', 1);
  insertPlatform.run('plat_eatclub', 'EatClub', 'eatclub', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=80&h=80&fit=crop', 'authorized', 1);
  insertPlatform.run('plat_direct', 'Direct Restaurant Order', 'direct', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=80&h=80&fit=crop', 'partner_feed', 1);

  // 3. Restaurants
  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants (id, name, logo, cuisine, description, rating, price_for_two)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertRestaurant.run(
    'rest_empire',
    'Empire Restaurant',
    'https://images.unsplash.com/photo-1552611052-33e04de081de?w=120&h=120&fit=crop',
    'North Indian, Biryani, Mughlai, Kebabs',
    'Bangalore iconic late-night dining chain serving aromatic biryanis, grilled chicken, and rich curries.',
    4.4,
    450
  );

  insertRestaurant.run(
    'rest_meghana',
    'Meghana Foods',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120&h=120&fit=crop',
    'Biryani, Andhra, South Indian',
    'Legendary Andhra-style chicken and mutton biryani with authentic fiery spices.',
    4.5,
    500
  );

  insertRestaurant.run(
    'rest_truffles',
    'Truffles',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&h=120&fit=crop',
    'American, Burgers, Continental, Desserts',
    'Famous for gourmet handcrafted burgers, peri-peri chicken steaks, and indulgent desserts.',
    4.6,
    400
  );

  insertRestaurant.run(
    'rest_nagarjuna',
    'Nagarjuna',
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=120&h=120&fit=crop',
    'Andhra, South Indian, Meals',
    'Traditional banana leaf Andhra meals, spicy chilli chicken, and sholay kebabs.',
    4.3,
    550
  );

  insertRestaurant.run(
    'rest_thirdwave',
    'Third Wave Coffee',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=120&h=120&fit=crop',
    'Coffee, Beverages, Bakery, Continental',
    'Artisanal specialty coffee roasters, cold brews, and freshly baked pastries.',
    4.5,
    350
  );

  // 4. Branches (Crucial Requirement: separate branch entity per location)
  const insertBranch = db.prepare(`
    INSERT INTO branches (id, restaurant_id, name, address, city, area, pincode, latitude, longitude, delivery_radius_km)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Empire Branches
  insertBranch.run('br_emp_ind', 'rest_empire', 'Empire - Indiranagar', '80 Feet Road, HAL 2nd Stage, Indiranagar', 'Bangalore', 'Indiranagar', '560038', 12.9716, 77.6412, 7.0);
  insertBranch.run('br_emp_kor', 'rest_empire', 'Empire - Koramangala', '5th Block, Jyoti Nivas College Road', 'Bangalore', 'Koramangala', '560095', 12.9352, 77.6245, 6.5);
  insertBranch.run('br_emp_whi', 'rest_empire', 'Empire - Whitefield', 'ITPL Main Road, Brookefield', 'Bangalore', 'Whitefield', '560066', 12.9698, 77.7499, 8.0);
  insertBranch.run('br_emp_hsr', 'rest_empire', 'Empire - HSR Layout', 'Sector 7, 14th Main Road', 'Bangalore', 'HSR Layout', '560102', 12.9121, 77.6446, 6.0);
  insertBranch.run('br_emp_jpn', 'rest_empire', 'Empire - JP Nagar', '24th Main Road, JP Nagar 5th Phase', 'Bangalore', 'JP Nagar', '560078', 12.9063, 77.5857, 6.5);

  // Meghana Foods Branches
  insertBranch.run('br_meg_ind', 'rest_meghana', 'Meghana Foods - Indiranagar', 'CMH Road, Near Metro Station, Indiranagar', 'Bangalore', 'Indiranagar', '560038', 12.9784, 77.6408, 6.0);
  insertBranch.run('br_meg_kor', 'rest_meghana', 'Meghana Foods - Koramangala', '1st Block, Near Forum Mall, Koramangala', 'Bangalore', 'Koramangala', '560095', 12.9340, 77.6190, 7.0);

  // Truffles Branches
  insertBranch.run('br_truf_kor', 'rest_truffles', 'Truffles - Koramangala', '93, 4th B Cross, 5th Block, Koramangala', 'Bangalore', 'Koramangala', '560095', 12.9348, 77.6212, 6.0);
  insertBranch.run('br_truf_ind', 'rest_truffles', 'Truffles - Indiranagar', '100 Feet Road, Indiranagar', 'Bangalore', 'Indiranagar', '560038', 12.9690, 77.6430, 6.5);

  // Nagarjuna Branches
  insertBranch.run('br_nag_ind', 'rest_nagarjuna', 'Nagarjuna - Indiranagar', 'Double Road, Indiranagar', 'Bangalore', 'Indiranagar', '560038', 12.9710, 77.6400, 6.0);

  // Third Wave Coffee Branches
  insertBranch.run('br_twc_ind', 'rest_thirdwave', 'Third Wave Coffee - Indiranagar', '12th Main Road, Indiranagar', 'Bangalore', 'Indiranagar', '560038', 12.9720, 77.6420, 5.0);
  insertBranch.run('br_twc_kor', 'rest_thirdwave', 'Third Wave Coffee - Koramangala', '4th Block, 80 Feet Road, Koramangala', 'Bangalore', 'Koramangala', '560034', 12.9320, 77.6280, 5.0);

  // 5. Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, restaurant_branch_id, name, normalized_name, description, category, cuisine, vegetarian, vegan, portion_size, portion_unit, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Empire Indiranagar Products
  insertProduct.run(
    'prod_emp_ckn_biry_ind',
    'br_emp_ind',
    'Empire Special Chicken Biryani',
    'chicken biryani',
    'Aromatic kacchi biryani layered with marinated chicken, saffron rice, and signature whole spices. Served with raita & salan.',
    'Biryani',
    'Mughlai',
    0, 0,
    500, 'g',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&h=350&fit=crop'
  );

  insertProduct.run(
    'prod_emp_veg_biry_ind',
    'br_emp_ind',
    'Veg Dum Biryani',
    'veg biryani',
    'Fresh garden vegetables, paneer cubes, and aromatic basmati rice slow-cooked on dum.',
    'Biryani',
    'North Indian',
    1, 0,
    450, 'g',
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&h=350&fit=crop'
  );

  insertProduct.run(
    'prod_emp_pbm_ind',
    'br_emp_ind',
    'Paneer Butter Masala',
    'paneer butter masala',
    'Creamy cottage cheese cubes simmered in a luscious tomato and cashew butter gravy.',
    'Curry',
    'North Indian',
    1, 0,
    400, 'g',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&h=350&fit=crop'
  );

  insertProduct.run(
    'prod_emp_kebab_ind',
    'br_emp_ind',
    'Empire Coin Parotta with Grill Chicken',
    'grilled chicken with parotta',
    'Quarter chicken slow-roasted with pepper marinade, served with 2 crispy flaky coin parottas.',
    'Fast Food',
    'Mughlai',
    0, 0,
    380, 'g',
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&h=350&fit=crop'
  );

  // Empire Koramangala Products
  insertProduct.run(
    'prod_emp_ckn_biry_kor',
    'br_emp_kor',
    'Empire Special Chicken Biryani',
    'chicken biryani',
    'Aromatic kacchi biryani layered with marinated chicken, saffron rice, and signature whole spices. Served with raita & salan.',
    'Biryani',
    'Mughlai',
    0, 0,
    500, 'g',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&h=350&fit=crop'
  );

  // Meghana Foods Indiranagar Products
  insertProduct.run(
    'prod_meg_ckn_biry_ind',
    'br_meg_ind',
    'Meghana Special Chicken Biryani',
    'chicken biryani',
    'Signature boneless Andhra chicken fry layered on aromatic spicy biryani rice. Known for its intense flavor.',
    'Biryani',
    'Andhra',
    0, 0,
    550, 'g',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&h=350&fit=crop'
  );

  insertProduct.run(
    'prod_meg_paneer_biry_ind',
    'br_meg_ind',
    'Meghana Paneer Biryani',
    'paneer biryani',
    'Crispy spiced paneer tossed in fiery Andhra masala layered with fragrant basmati rice.',
    'Biryani',
    'Andhra',
    1, 0,
    500, 'g',
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&h=350&fit=crop'
  );

  // Truffles Indiranagar & Koramangala
  insertProduct.run(
    'prod_truf_burger_ind',
    'br_truf_ind',
    'All American Cheese Burger',
    'all american burger',
    'Juicy handcrafted patty with melted cheddar, crisp lettuce, gherkins, and house secret burger relish. Served with fries.',
    'Burger',
    'American',
    0, 0,
    350, 'g',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=350&fit=crop'
  );

  insertProduct.run(
    'prod_truf_pasta_ind',
    'br_truf_ind',
    'Peri Peri Veg Pasta',
    'peri peri pasta',
    'Penne pasta tossed in spicy creamy peri-peri cheese sauce with bell peppers and black olives.',
    'Italian',
    'Continental',
    1, 0,
    420, 'g',
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=500&h=350&fit=crop'
  );

  // Nagarjuna Indiranagar Products
  insertProduct.run(
    'prod_nag_dosa_ind',
    'br_nag_ind',
    'Special Masala Dosa',
    'masala dosa',
    'Crisp golden fermented rice crepe smeared with red chutney and stuffed with spiced potato mash. Served with 2 chutneys & sambar.',
    'South Indian',
    'South Indian',
    1, 0,
    280, 'g',
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&h=350&fit=crop'
  );

  insertProduct.run(
    'prod_nag_chilli_ind',
    'br_nag_ind',
    'Nagarjuna Andhra Chilli Chicken',
    'andhra chilli chicken',
    'Fiery green chilli-tossed chicken chunks sautéed with curry leaves and Andhra spices.',
    'Starters',
    'South Indian',
    0, 0,
    320, 'g',
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&h=350&fit=crop'
  );

  // Third Wave Coffee Indiranagar
  insertProduct.run(
    'prod_twc_coldbrew_ind',
    'br_twc_ind',
    'Classic Vietnamese Cold Brew',
    'cold brew coffee',
    'Single-origin Arabica coffee steeped for 18 hours, paired with sweet condensed milk over ice.',
    'Beverages',
    'Coffee',
    1, 0,
    350, 'ml',
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&h=350&fit=crop'
  );

  // 6. Product Prices across Platforms (Transparent real breakdown)
  const insertPrice = db.prepare(`
    INSERT INTO product_prices (
      id, product_id, platform_id, item_price, delivery_fee, platform_fee,
      packaging_fee, taxes, discount, final_price, membership_discount, membership_type,
      currency, order_url, availability, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  // Empire Chicken Biryani (Indiranagar)
  // Zomato: Item 220, Del 28, Plat 8, Pack 15, Tax 12, Disc 35 -> Final 248
  insertPrice.run('pr_emp_biry_zom', 'prod_emp_ckn_biry_ind', 'plat_zomato', 220, 28, 8, 15, 12, 35, 248, 22, 'Zomato Gold', 'INR', 'https://www.zomato.com/bangalore/hotel-empire-indiranagar/order?item=Chicken+Biryani', 1, '-8 minutes');
  // Swiggy: Item 210, Del 22, Plat 7, Pack 12, Tax 11, Disc 30 -> Final 232
  insertPrice.run('pr_emp_biry_swg', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 210, 22, 7, 12, 11, 30, 232, 21, 'Swiggy One', 'INR', 'https://www.swiggy.com/restaurants/hotel-empire-indiranagar-bangalore?search=Chicken+Biryani', 1, '-12 minutes');
  // EatClub: Item 215, Del 0, Plat 0, Pack 0, Tax 9, Disc 40 -> Final 184
  insertPrice.run('pr_emp_biry_eat', 'prod_emp_ckn_biry_ind', 'plat_eatclub', 215, 0, 0, 0, 9, 40, 184, 20, 'EatClub Pass', 'INR', 'https://eatclub.in/restaurant/empire-indiranagar/chicken-biryani', 1, '-15 minutes');
  // Direct: Item 200, Del 20, Plat 0, Pack 10, Tax 10, Disc 20 -> Final 220
  insertPrice.run('pr_emp_biry_dir', 'prod_emp_ckn_biry_ind', 'plat_direct', 200, 20, 0, 10, 10, 20, 220, 0, null, 'INR', 'https://hotelempire.in/order', 1, '-5 minutes');

  // Meghana Special Chicken Biryani
  insertPrice.run('pr_meg_biry_zom', 'prod_meg_ckn_biry_ind', 'plat_zomato', 310, 32, 8, 18, 16, 40, 344, 31, 'Zomato Gold', 'INR', 'https://www.zomato.com/bangalore/meghana-foods-indiranagar/order', 1, '-10 minutes');
  insertPrice.run('pr_meg_biry_swg', 'prod_meg_ckn_biry_ind', 'plat_swiggy', 299, 25, 7, 15, 15, 30, 331, 30, 'Swiggy One', 'INR', 'https://www.swiggy.com/restaurants/meghana-foods-indiranagar', 1, '-4 minutes');
  insertPrice.run('pr_meg_biry_dir', 'prod_meg_ckn_biry_ind', 'plat_direct', 290, 20, 0, 10, 15, 25, 310, 0, null, 'INR', 'https://meghanafoods.co.in', 1, '-30 minutes');

  // Paneer Butter Masala (Empire)
  insertPrice.run('pr_emp_pbm_zom', 'prod_emp_pbm_ind', 'plat_zomato', 240, 28, 8, 15, 13, 35, 269, 24, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-18 minutes');
  insertPrice.run('pr_emp_pbm_swg', 'prod_emp_pbm_ind', 'plat_swiggy', 230, 22, 7, 12, 12, 30, 253, 23, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-14 minutes');
  insertPrice.run('pr_emp_pbm_eat', 'prod_emp_pbm_ind', 'plat_eatclub', 225, 0, 0, 0, 10, 35, 200, 15, 'EatClub Pass', 'INR', 'https://eatclub.in', 1, '-20 minutes');
  insertPrice.run('pr_emp_pbm_dir', 'prod_emp_pbm_ind', 'plat_direct', 215, 20, 0, 10, 11, 20, 236, 0, null, 'INR', 'https://hotelempire.in', 1, '-6 minutes');

  // Veg Dum Biryani
  insertPrice.run('pr_emp_vbiry_zom', 'prod_emp_veg_biry_ind', 'plat_zomato', 190, 28, 8, 15, 10, 25, 226, 19, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-25 minutes');
  insertPrice.run('pr_emp_vbiry_swg', 'prod_emp_veg_biry_ind', 'plat_swiggy', 185, 22, 7, 12, 10, 20, 216, 18, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-11 minutes');
  insertPrice.run('pr_emp_vbiry_eat', 'prod_emp_veg_biry_ind', 'plat_eatclub', 180, 0, 0, 0, 8, 30, 158, 15, 'EatClub Pass', 'INR', 'https://eatclub.in', 1, '-35 minutes');

  // All American Cheese Burger (Truffles)
  insertPrice.run('pr_truf_brg_zom', 'prod_truf_burger_ind', 'plat_zomato', 270, 30, 8, 15, 14, 40, 297, 27, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-9 minutes');
  insertPrice.run('pr_truf_brg_swg', 'prod_truf_burger_ind', 'plat_swiggy', 260, 25, 7, 12, 14, 35, 283, 26, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-7 minutes');
  insertPrice.run('pr_truf_brg_dir', 'prod_truf_burger_ind', 'plat_direct', 250, 0, 0, 10, 13, 25, 248, 0, null, 'INR', 'https://truffles.co.in', 1, '-40 minutes');

  // Masala Dosa (Nagarjuna)
  insertPrice.run('pr_nag_dosa_zom', 'prod_nag_dosa_ind', 'plat_zomato', 120, 25, 8, 10, 7, 15, 155, 12, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-15 minutes');
  insertPrice.run('pr_nag_dosa_swg', 'prod_nag_dosa_ind', 'plat_swiggy', 115, 20, 7, 8, 6, 10, 146, 11, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-22 minutes');
  insertPrice.run('pr_nag_dosa_dir', 'prod_nag_dosa_ind', 'plat_direct', 105, 15, 0, 5, 5, 10, 120, 0, null, 'INR', 'https://nagarjunarestaurants.com', 1, '-45 minutes');

  // Classic Cold Brew (Third Wave Coffee)
  insertPrice.run('pr_twc_cb_zom', 'prod_twc_coldbrew_ind', 'plat_zomato', 230, 25, 8, 12, 12, 30, 257, 23, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-12 minutes');
  insertPrice.run('pr_twc_cb_swg', 'prod_twc_coldbrew_ind', 'plat_swiggy', 225, 20, 7, 10, 12, 25, 249, 22, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-18 minutes');
  insertPrice.run('pr_twc_cb_dir', 'prod_twc_coldbrew_ind', 'plat_direct', 210, 0, 0, 5, 11, 20, 206, 0, null, 'INR', 'https://thirdwavecoffeeroasters.com', 1, '-60 minutes');

  // Empire Coin Parotta with Grill Chicken (Indiranagar)
  insertPrice.run('pr_emp_kebab_zom', 'prod_emp_kebab_ind', 'plat_zomato', 230, 25, 8, 15, 12, 30, 260, 23, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-14 minutes');
  insertPrice.run('pr_emp_kebab_swg', 'prod_emp_kebab_ind', 'plat_swiggy', 220, 20, 7, 12, 11, 25, 245, 22, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-16 minutes');
  insertPrice.run('pr_emp_kebab_eat', 'prod_emp_kebab_ind', 'plat_eatclub', 210, 0, 0, 0, 9, 35, 184, 20, 'EatClub Pass', 'INR', 'https://eatclub.in', 1, '-22 minutes');
  insertPrice.run('pr_emp_kebab_dir', 'prod_emp_kebab_ind', 'plat_direct', 195, 15, 0, 10, 10, 15, 215, 0, null, 'INR', 'https://hotelempire.in', 1, '-30 minutes');

  // Empire Special Chicken Biryani (Koramangala)
  insertPrice.run('pr_emp_ckn_kor_zom', 'prod_emp_ckn_biry_kor', 'plat_zomato', 225, 28, 8, 15, 12, 35, 253, 22, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-10 minutes');
  insertPrice.run('pr_emp_ckn_kor_swg', 'prod_emp_ckn_biry_kor', 'plat_swiggy', 215, 22, 7, 12, 11, 30, 237, 21, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-8 minutes');
  insertPrice.run('pr_emp_ckn_kor_eat', 'prod_emp_ckn_biry_kor', 'plat_eatclub', 215, 0, 0, 0, 9, 40, 184, 20, 'EatClub Pass', 'INR', 'https://eatclub.in', 1, '-15 minutes');
  insertPrice.run('pr_emp_ckn_kor_dir', 'prod_emp_ckn_biry_kor', 'plat_direct', 205, 20, 0, 10, 10, 20, 225, 0, null, 'INR', 'https://hotelempire.in', 1, '-40 minutes');

  // Meghana Paneer Biryani (Indiranagar)
  insertPrice.run('pr_meg_pnb_zom', 'prod_meg_paneer_biry_ind', 'plat_zomato', 280, 30, 8, 15, 14, 35, 312, 28, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-11 minutes');
  insertPrice.run('pr_meg_pnb_swg', 'prod_meg_paneer_biry_ind', 'plat_swiggy', 270, 24, 7, 12, 13, 30, 296, 27, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-19 minutes');
  insertPrice.run('pr_meg_pnb_dir', 'prod_meg_paneer_biry_ind', 'plat_direct', 260, 20, 0, 10, 12, 20, 282, 0, null, 'INR', 'https://meghanafoods.co.in', 1, '-25 minutes');

  // Peri Peri Veg Pasta (Truffles Indiranagar)
  insertPrice.run('pr_truf_pst_zom', 'prod_truf_pasta_ind', 'plat_zomato', 260, 28, 8, 15, 13, 35, 289, 26, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-15 minutes');
  insertPrice.run('pr_truf_pst_swg', 'prod_truf_pasta_ind', 'plat_swiggy', 250, 22, 7, 12, 12, 30, 273, 25, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-12 minutes');
  insertPrice.run('pr_truf_pst_dir', 'prod_truf_pasta_ind', 'plat_direct', 240, 0, 0, 10, 12, 20, 242, 0, null, 'INR', 'https://truffles.co.in', 1, '-35 minutes');

  // Nagarjuna Andhra Chilli Chicken (Indiranagar)
  insertPrice.run('pr_nag_chl_zom', 'prod_nag_chilli_ind', 'plat_zomato', 290, 30, 8, 15, 15, 35, 323, 29, 'Zomato Gold', 'INR', 'https://www.zomato.com', 1, '-8 minutes');
  insertPrice.run('pr_nag_chl_swg', 'prod_nag_chilli_ind', 'plat_swiggy', 280, 25, 7, 12, 14, 30, 308, 28, 'Swiggy One', 'INR', 'https://www.swiggy.com', 1, '-14 minutes');
  insertPrice.run('pr_nag_chl_dir', 'prod_nag_chilli_ind', 'plat_direct', 265, 15, 0, 10, 13, 20, 283, 0, null, 'INR', 'https://nagarjunarestaurants.com', 1, '-50 minutes');

  // 7. Product Matches (Demonstrates Product Matching Engine records)
  const insertMatch = db.prepare(`
    INSERT INTO product_matches (id, product_id, platform_id, platform_product_id, platform_item_name, confidence_score, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertMatch.run('m_1', 'prod_emp_ckn_biry_ind', 'plat_zomato', 'zom_emp_101', 'Empire Special Chicken Biryani (500g)', 0.96, 'verified');
  insertMatch.run('m_2', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 'swg_emp_502', 'Chicken Biryani - Hotel Empire', 0.91, 'verified');
  insertMatch.run('m_3', 'prod_emp_ckn_biry_ind', 'plat_eatclub', 'eat_emp_809', 'Hyderabadi Chicken Biryani Bowl', 0.86, 'verified');
  insertMatch.run('m_4', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 'swg_emp_999', 'Chicken Biryani Family Bucket (1200g)', 0.61, 'pending_review'); // Low confidence sample for admin queue!
  insertMatch.run('m_5', 'prod_emp_kebab_ind', 'plat_swiggy', 'swg_emp_kebab', 'Coin Parotta with Grilled Chicken Quarter', 0.94, 'verified');
  insertMatch.run('m_6', 'prod_meg_paneer_biry_ind', 'plat_zomato', 'zom_meg_paneer', 'Meghana Spl Paneer Biryani', 0.95, 'verified');
  insertMatch.run('m_7', 'prod_truf_pasta_ind', 'plat_swiggy', 'swg_truf_pasta', 'Peri Peri Creamy Pasta', 0.92, 'verified');
  insertMatch.run('m_8', 'prod_nag_chilli_ind', 'plat_zomato', 'zom_nag_chilli', 'Nagarjuna Chilli Chicken Boneless', 0.93, 'verified');

  // 8. Price History (For Section 15: Today, Yesterday, 7 days ago, 30-day average)
  const insertHistory = db.prepare(`
    INSERT INTO price_history (id, product_id, platform_id, price, recorded_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);

  // Empire Biryani Swiggy History
  insertHistory.run('h_swg_today', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 232, '-10 minutes');
  insertHistory.run('h_swg_yest', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 238, '-1 day');
  insertHistory.run('h_swg_7d', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 225, '-7 days');
  insertHistory.run('h_swg_14d', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 240, '-14 days');
  insertHistory.run('h_swg_30d', 'prod_emp_ckn_biry_ind', 'plat_swiggy', 228, '-30 days');

  // Empire Biryani Zomato History
  insertHistory.run('h_zom_today', 'prod_emp_ckn_biry_ind', 'plat_zomato', 248, '-10 minutes');
  insertHistory.run('h_zom_yest', 'prod_emp_ckn_biry_ind', 'plat_zomato', 255, '-1 day');
  insertHistory.run('h_zom_7d', 'prod_emp_ckn_biry_ind', 'plat_zomato', 239, '-7 days');
  insertHistory.run('h_zom_14d', 'prod_emp_ckn_biry_ind', 'plat_zomato', 245, '-14 days');
  insertHistory.run('h_zom_30d', 'prod_emp_ckn_biry_ind', 'plat_zomato', 250, '-30 days');

  // Empire Biryani EatClub History
  insertHistory.run('h_eat_today', 'prod_emp_ckn_biry_ind', 'plat_eatclub', 184, '-15 minutes');
  insertHistory.run('h_eat_yest', 'prod_emp_ckn_biry_ind', 'plat_eatclub', 184, '-1 day');
  insertHistory.run('h_eat_7d', 'prod_emp_ckn_biry_ind', 'plat_eatclub', 179, '-7 days');
  insertHistory.run('h_eat_30d', 'prod_emp_ckn_biry_ind', 'plat_eatclub', 189, '-30 days');

  // Meghana Paneer Biryani History
  insertHistory.run('h_meg_pb_today', 'prod_meg_paneer_biry_ind', 'plat_swiggy', 296, '-19 minutes');
  insertHistory.run('h_meg_pb_yest', 'prod_meg_paneer_biry_ind', 'plat_swiggy', 296, '-1 day');
  insertHistory.run('h_meg_pb_7d', 'prod_meg_paneer_biry_ind', 'plat_swiggy', 285, '-7 days');

  // Truffles Pasta History
  insertHistory.run('h_trf_pst_today', 'prod_truf_pasta_ind', 'plat_zomato', 289, '-15 minutes');
  insertHistory.run('h_trf_pst_yest', 'prod_truf_pasta_ind', 'plat_zomato', 289, '-1 day');
  insertHistory.run('h_trf_pst_7d', 'prod_truf_pasta_ind', 'plat_zomato', 280, '-7 days');

  // Nagarjuna Chilli Chicken History
  insertHistory.run('h_nag_chl_today', 'prod_nag_chilli_ind', 'plat_swiggy', 308, '-14 minutes');
  insertHistory.run('h_nag_chl_yest', 'prod_nag_chilli_ind', 'plat_swiggy', 315, '-1 day');
  insertHistory.run('h_nag_chl_7d', 'prod_nag_chilli_ind', 'plat_swiggy', 299, '-7 days');

  // Empire Kebab History
  insertHistory.run('h_emp_kbb_today', 'prod_emp_kebab_ind', 'plat_eatclub', 184, '-22 minutes');
  insertHistory.run('h_emp_kbb_yest', 'prod_emp_kebab_ind', 'plat_eatclub', 184, '-1 day');
  insertHistory.run('h_emp_kbb_7d', 'prod_emp_kebab_ind', 'plat_eatclub', 180, '-7 days');

  // 9. Initial Favorites & Price Alerts
  const insertFav = db.prepare(`INSERT INTO favorites (id, user_id, product_id) VALUES (?, ?, ?)`);
  insertFav.run('fav_1', 'usr_demo', 'prod_emp_ckn_biry_ind');

  const insertAlert = db.prepare(`
    INSERT INTO price_alerts (id, user_id, product_id, target_price, active)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAlert.run('alert_1', 'usr_demo', 'prod_emp_ckn_biry_ind', 190, 1);

  console.log('✅ Seed completed successfully with realistic multi-branch, multi-platform data.');
}

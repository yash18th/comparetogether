CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  cuisine TEXT NOT NULL,
  description TEXT,
  rating REAL DEFAULT 4.2,
  price_for_two INTEGER DEFAULT 400,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  delivery_radius_km REAL DEFAULT 8.0,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  restaurant_branch_id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT,
  description TEXT,
  category TEXT NOT NULL,
  cuisine TEXT,
  vegetarian INTEGER DEFAULT 0,
  vegan INTEGER DEFAULT 0,
  portion_size REAL,
  portion_unit TEXT DEFAULT 'g',
  image TEXT,
  is_available INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  integration_status TEXT DEFAULT 'authorized', -- 'authorized', 'partner_feed', 'pending'
  is_official INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS product_prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  item_price REAL NOT NULL,
  delivery_fee REAL DEFAULT 0,
  platform_fee REAL DEFAULT 0,
  packaging_fee REAL DEFAULT 0,
  taxes REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  final_price REAL NOT NULL,
  membership_discount REAL DEFAULT 0,
  membership_type TEXT, -- e.g. 'Swiggy One', 'Zomato Gold'
  currency TEXT DEFAULT 'INR',
  order_url TEXT,
  availability INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_matches (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  platform_product_id TEXT,
  platform_item_name TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  verification_status TEXT DEFAULT 'verified', -- 'verified', 'pending_review', 'rejected'
  matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  price REAL NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorite_restaurants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, restaurant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  target_price REAL NOT NULL,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  query TEXT NOT NULL,
  location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_comparisons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS oauth_sessions (
  platform_code TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at DATETIME,
  code_verifier TEXT,
  state TEXT,
  address_id TEXT,
  address_details TEXT,
  scope TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance and search
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_branch ON products(restaurant_branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_city_area ON branches(city, area);
CREATE INDEX IF NOT EXISTS idx_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_prod ON price_history(product_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_matches_prod ON product_matches(product_id);


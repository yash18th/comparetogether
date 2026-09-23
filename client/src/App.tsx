import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider, useLocation } from './context/LocationContext';
import { MembershipProvider, useMembership } from './context/MembershipContext';
import { Navbar } from './components/Navbar';
import { HeritageHero } from './components/HeritageHero';
import { HeritageDivider } from './components/HeritageDivider';
import { HowItWorksSection } from './components/HowItWorksSection';
import { PriceComparisonPreview } from './components/PriceComparisonPreview';
import { ValuePropositionSection } from './components/ValuePropositionSection';
import { PriceAlertFeatureSection } from './components/PriceAlertFeatureSection';
import { FinalCTASection } from './components/FinalCTASection';
import { FilterBar } from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import { ComparisonModal } from './components/ComparisonModal';
import { LocationModal } from './components/LocationModal';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { api } from './services/api';
import type { SearchProductItem } from './types';
import { ArrowLeft, AlertCircle, Search } from 'lucide-react';

const MainApp: React.FC = () => {
  const { location } = useLocation();
  const { hasMembership } = useMembership();
  const { user } = useAuth();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [viewMode, setViewMode] = useState<'home' | 'search_results' | 'dashboard' | 'admin'>('home');
  const [dashboardTab, setDashboardTab] = useState<'favorites' | 'alerts' | 'history'>('favorites');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [dietary, setDietary] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [priceRange, setPriceRange] = useState('');
  const [platform, setPlatform] = useState('');
  const [sortBy, setSortBy] = useState('final_price_asc');

  // Results & Modals
  const [products, setProducts] = useState<SearchProductItem[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Background comparison engine health state (does NOT block homepage rendering)
  const [comparisonEngineReady, setComparisonEngineReady] = useState(true);
  const [comparisonEngineLoading, setComparisonEngineLoading] = useState(false);
  const [comparisonEngineError, setComparisonEngineError] = useState<string | null>(null);

  // Check engine health in background without blocking UI
  const checkEngineHealth = useCallback(async () => {
    setComparisonEngineLoading(true);
    try {
      const res = await api.checkHealth();
      if (res.ok) {
        setComparisonEngineReady(true);
        setComparisonEngineError(null);
      } else {
        setComparisonEngineReady(false);
        setComparisonEngineError(res.message || 'Comparison service temporarily unavailable');
      }
    } catch {
      setComparisonEngineReady(false);
      setComparisonEngineError('Comparison service temporarily unavailable');
    } finally {
      setComparisonEngineLoading(false);
    }
  }, []);

  useEffect(() => {
    checkEngineHealth();
  }, [checkEngineHealth]);

  // Sync theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Swiggy OAuth redirect notification toast
  const [swiggyToast, setSwiggyToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const integration = params.get('integration');
      if (integration === 'swiggy_success') {
        setSwiggyToast({
          type: 'success',
          message: 'Swiggy account connected via Builders Club MCP! Delivery address synced via get_addresses and real-time live prices unlocked.'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (integration === 'swiggy_error') {
        const errorDesc = params.get('error') || 'Authorization was cancelled or encountered an error';
        setSwiggyToast({
          type: 'error',
          message: `Swiggy Connection: ${decodeURIComponent(errorDesc)}`
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Load favorites if user logged in
  useEffect(() => {
    if (user) {
      api.getFavorites().then(favs => {
        const map: Record<string, boolean> = {};
        favs.forEach(f => { map[f.product_id] = true; });
        setFavorites(map);
      }).catch(console.error);
    } else {
      setFavorites({});
    }
  }, [user]);

  // Execute search API query
  const executeSearch = useCallback(async (overrideQuery?: string, overrideCategory?: string) => {
    // Only query backend if in search_results view
    if (viewMode !== 'search_results') return;

    const q = typeof overrideQuery === 'string' ? overrideQuery : searchQuery;
    const cat = typeof overrideCategory === 'string' ? overrideCategory : category;

    // Do NOT fire API request if query is empty AND category is 'All'
    if (!q.trim() && cat === 'All') {
      setProducts([]);
      setLoading(false);
      setSearchError(null);
      return;
    }

    setLoading(true);
    setSearchError(null);

    try {
      let minP: number | undefined = undefined;
      let maxP: number | undefined = undefined;
      if (priceRange) {
        const parts = priceRange.split('-').map(Number);
        minP = parts[0];
        maxP = parts[1];
      }

      const results = await api.search({
        q: q.trim(),
        city: location.city,
        area: location.area,
        pincode: location.pincode,
        category: cat !== 'All' ? cat : undefined,
        vegetarian: dietary === 'veg' ? true : dietary === 'non-veg' ? false : undefined,
        minPrice: minP,
        maxPrice: maxP,
        platform: platform || undefined,
        sortBy: sortBy as any,
        membership: hasMembership
      });
      setProducts(results);
    } catch (err: any) {
      console.warn('Search query error:', err);
      setSearchError(err?.message || 'Comparison server is currently unreachable. Please retry.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, searchQuery, location, category, dietary, priceRange, platform, sortBy, hasMembership]);

  useEffect(() => {
    if (viewMode === 'search_results') {
      executeSearch();
    }
  }, [viewMode, executeSearch]);

  const handleToggleFavorite = async (id: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const res = await api.toggleFavorite(id);
    setFavorites(prev => ({ ...prev, [id]: res.isFavorite }));
  };

  // Actions triggering search mode
  const handleHeroSearch = (query: string) => {
    setSearchQuery(query);
    setCategory('All');
    setViewMode('search_results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (cat: string) => {
    // Toggle category; DO NOT overwrite searchQuery with cat!
    const newCat = category === cat ? 'All' : cat;
    setCategory(newCat);
    setSearchQuery('');
    setViewMode('search_results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartComparing = () => {
    if (viewMode === 'home') {
      const searchInput = document.querySelector('.luxury-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput.focus();
        searchInput.style.boxShadow = '0 0 24px rgba(212, 175, 55, 0.7)';
        setTimeout(() => { searchInput.style.boxShadow = ''; }, 1800);
        return;
      }
    }
    if (viewMode === 'search_results') {
      const inPageInput = document.querySelector('.search-input') as HTMLInputElement;
      if (inPageInput) {
        inPageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inPageInput.focus();
        return;
      }
    }
    setViewMode('home');
    setTimeout(() => {
      const searchInput = document.querySelector('.luxury-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput.focus();
      }
    }, 100);
  };

  const handleOpenDashboardTab = (tab?: 'favorites' | 'alerts') => {
    if (tab) setDashboardTab(tab);
    setViewMode('dashboard');
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        onOpenLocation={() => setShowLocationModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onToggleDashboard={handleOpenDashboardTab}
        onToggleAdmin={() => setViewMode(viewMode === 'admin' ? 'home' : 'admin')}
        onStartComparing={handleStartComparing}
        viewMode={viewMode}
        theme={theme}
        onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      />

      {/* Swiggy OAuth Redirect Toast */}
      {swiggyToast && (
        <div style={{
          position: 'fixed',
          top: 76,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          maxWidth: 600,
          width: '90%',
          background: swiggyToast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <span>{swiggyToast.message}</span>
          <button
            type="button"
            onClick={() => setSwiggyToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}

      <main>
        {viewMode === 'admin' ? (
          <div className="main-content">
            <AdminDashboard onBackToSearch={() => setViewMode('home')} />
          </div>
        ) : viewMode === 'dashboard' ? (
          <div className="main-content">
            <UserDashboard
              initialTab={dashboardTab}
              onOpenProduct={(id) => setSelectedProductId(id)}
              onBackToSearch={() => setViewMode('home')}
              onSearchAgain={(query) => {
                setSearchQuery(query);
                setViewMode('search_results');
                executeSearch(query);
              }}
              onOpenAuth={() => setShowAuthModal(true)}
            />
          </div>
        ) : viewMode === 'search_results' ? (
          /* SEARCH RESULTS PAGE (Appears only after search) */
          <div className="main-content" style={{ paddingTop: 24 }}>
            {/* Back Button & Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <button
                type="button"
                className="back-to-home-btn"
                onClick={() => setViewMode('home')}
              >
                <ArrowLeft size={16} />
                <span>Return to Home</span>
              </button>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Delivering to <strong>{location.area}</strong> ({location.city})
              </div>
            </div>

            {/* Results Title & Search Modification Bar */}
            <div style={{ marginBottom: 24 }}>
              <h2 className="font-heritage" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)', marginBottom: 8 }}>
                {searchQuery && category !== 'All'
                  ? `Comparisons for "${searchQuery}" in ${category}`
                  : searchQuery
                  ? `Comparisons for "${searchQuery}"`
                  : category !== 'All'
                  ? `${category} Comparisons`
                  : `Search Food Comparisons`}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                Transparent pricing comparison across Zomato, Swiggy, EatClub & direct ordering.
              </p>
            </div>

            {/* Search Input In-Page */}
            <div className="search-container" style={{ maxWidth: 840, margin: '0 0 24px 0' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!searchQuery.trim()) return;
                  executeSearch(searchQuery.trim());
                }}
                className="search-input-wrapper"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                <Search size={18} color="var(--accent-gold)" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search another dish or restaurant (e.g. Empire, Dosa, Burger)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ padding: '7px 18px', fontSize: '0.84rem', opacity: loading ? 0.7 : 1 }}
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Filter & Sort Controls */}
            <FilterBar
              category={category}
              onCategoryChange={setCategory}
              dietary={dietary}
              onDietaryChange={setDietary}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              platform={platform}
              onPlatformChange={setPlatform}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />

            {/* Result count & active location badge */}
            {!loading && !searchError && products.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 16px 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                <span>Showing <strong>{products.length}</strong> verified comparison {products.length === 1 ? 'item' : 'items'}</span>
                <span>Delivering to <strong>{location.area}</strong></span>
              </div>
            )}

            {/* Results Grid / Loading / Error / Empty States */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '3px solid var(--border-glass)',
                  borderTopColor: 'var(--accent-gold)',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Comparing platform prices...</div>
                <div style={{ fontSize: '0.85rem', marginTop: 6, color: 'var(--text-secondary)' }}>Checking live restaurant branches in {location.area}...</div>
              </div>
            ) : searchError ? (
              <div className="glass-panel heritage-frame" style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 540, margin: '20px auto' }}>
                <AlertCircle size={40} color="#e58e7b" style={{ margin: '0 auto 12px' }} />
                <h3 className="font-heritage" style={{ fontSize: '1.25rem', marginBottom: 8, color: '#e58e7b' }}>Connection Notice</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                  {searchError}
                </p>
                <button
                  type="button"
                  className="btn-gold"
                  onClick={() => executeSearch()}
                >
                  Retry Search
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="glass-panel heritage-frame" style={{ textAlign: 'center', padding: '50px 20px', maxWidth: 540, margin: '20px auto' }}>
                <AlertCircle size={44} color="var(--accent-gold)" style={{ margin: '0 auto 12px' }} />
                <h3 className="font-heritage" style={{ fontSize: '1.3rem', marginBottom: 8 }}>
                  {!searchQuery.trim() && category === 'All'
                    ? "Search Food Comparisons"
                    : "No matching food items found"}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
                  {!searchQuery.trim() && category === 'All' ? (
                    `Enter a dish name above or choose from popular dishes below to compare live prices in ${location.area}.`
                  ) : searchQuery.trim() && category !== 'All' ? (
                    <>We couldn't find <strong>"{searchQuery}"</strong> in the <strong>"{category}"</strong> category delivering to {location.area}. Try clearing filters or searching across all categories.</>
                  ) : searchQuery.trim() ? (
                    <>We couldn't find items for <strong>"{searchQuery}"</strong> delivering to {location.area}. Try searching for "Chicken Biryani", "Empire", or change delivery location.</>
                  ) : (
                    <>No items currently available in the <strong>"{category}"</strong> category delivering to {location.area}. Try selecting another cuisine or area.</>
                  )}
                </p>
                {!searchQuery.trim() && category === 'All' ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                    {['Chicken Biryani', 'Empire Special', 'Butter Chicken', 'Masala Dosa', 'Burgers'].map(dish => (
                      <button
                        key={dish}
                        type="button"
                        className="chip-btn active"
                        onClick={() => {
                          setSearchQuery(dish);
                          executeSearch(dish);
                        }}
                      >
                        {dish}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-gold"
                    onClick={() => {
                      setSearchQuery('');
                      setCategory('All');
                      setDietary('all');
                      setPlatform('');
                      setPriceRange('');
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="products-grid">
                {products.map((item) => (
                  <ProductCard
                    key={item.product_id}
                    item={item}
                    isFavorite={Boolean(favorites[item.product_id])}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenDetails={(id) => setSelectedProductId(id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* HOMEPAGE LUXURY BRAND LANDING PAGE (No Restaurant Grid) */
          <>
            {/* 1. Hero Section with Heritage Slideshow */}
            <HeritageHero
              onSearch={handleHeroSearch}
              onOpenLocation={() => setShowLocationModal(true)}
              onSelectCategory={handleSelectCategory}
              comparisonEngineReady={comparisonEngineReady}
              comparisonEngineLoading={comparisonEngineLoading}
              comparisonEngineError={comparisonEngineError}
              onRetryEngine={checkEngineHealth}
            />

            <HeritageDivider />

            {/* 2. How It Works */}
            <HowItWorksSection />

            <HeritageDivider />

            {/* 3. Single Attractive Price Comparison Preview */}
            <PriceComparisonPreview onStartLiveCompare={handleStartComparing} />

            <HeritageDivider />

            {/* 4. Real Cost Transparency Value Proposition */}
            <ValuePropositionSection />

            <HeritageDivider />

            {/* 5. Smart Price Alert Feature */}
            <PriceAlertFeatureSection
              onTriggerAlertDemo={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  handleOpenDashboardTab('alerts');
                }
              }}
            />

            <HeritageDivider />

            {/* 6. Final Call to Action */}
            <FinalCTASection onStartComparing={handleStartComparing} />
          </>
        )}
      </main>

      {/* Comparison Detail Modal */}
      {selectedProductId && (
        <ComparisonModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onSwitchProduct={(id) => setSelectedProductId(id)}
        />
      )}

      {/* Location Picker Modal */}
      {showLocationModal && (
        <LocationModal onClose={() => setShowLocationModal(false)} />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Luxury Heritage Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-glass)',
        padding: '36px 24px',
        background: 'var(--bg-secondary)',
        fontSize: '0.86rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="font-heritage" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Food<span style={{ color: 'var(--accent-gold)' }}>Compare</span>
            </span>
            <span>•</span>
            <span>India's Premium Food Ordering Price Intelligence</span>
          </div>

          <div style={{ display: 'flex', gap: 18 }}>
            <span>Source-Backed Data</span>
            <span>•</span>
            <span>Normalized ₹/100g</span>
            <span>•</span>
            <span>Zero Hidden Fees</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <MembershipProvider>
          <MainApp />
        </MembershipProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;

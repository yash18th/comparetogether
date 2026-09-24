import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { getApiBaseUrl } from '../services/api';

interface HeritageHeroProps {
  onSearch: (query: string) => void;
  onOpenLocation: () => void;
  onSelectCategory: (category: string) => void;
  comparisonEngineReady?: boolean;
  comparisonEngineLoading?: boolean;
  comparisonEngineError?: string | null;
  onRetryEngine?: () => void;
}

// Curated high-resolution Indian heritage architectural backgrounds
const HERITAGE_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1920&q=80&fit=crop',
    caption: 'Carved stone heritage corridor'
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80&fit=crop',
    caption: 'Palatial arches with warm illumination'
  },
  {
    url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1920&q=80&fit=crop',
    caption: 'Traditional Dravidian carved pillars'
  },
  {
    url: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=80&fit=crop',
    caption: 'Royal sandstone heritage pavilion'
  }
];

const ROTATING_PLACEHOLDERS = [
  'Chicken Biryani',
  'Masala Dosa',
  'Pizza',
  'Burger',
  'Paneer Butter Masala'
];

const CATEGORY_SHORTCUTS = [
  'Biryani',
  'South Indian',
  'Pizza',
  'Burgers',
  'Chinese',
  'Desserts',
  'Coffee',
  'North Indian'
];

export const HeritageHero: React.FC<HeritageHeroProps> = ({
  onSearch,
  onOpenLocation,
  onSelectCategory,
  comparisonEngineReady = true,
  comparisonEngineLoading = false,
  comparisonEngineError = null,
  onRetryEngine
}) => {
  const { location } = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Automatic slow background slideshow crossfade
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERITAGE_SLIDES.length);
    }, 7500);
    return () => clearInterval(timer);
  }, []);

  // Placeholder text rotation every 3.2 seconds
  useEffect(() => {
    const pTimer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PLACEHOLDERS.length);
    }, 3200);
    return () => clearInterval(pTimer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    } else {
      // Default to the current placeholder dish if empty
      onSearch(ROTATING_PLACEHOLDERS[placeholderIndex]);
    }
  };

  return (
    <section className="hero-heritage-container">
      {/* Background Slideshow */}
      <div className="hero-bg-slideshow" aria-hidden="true">
        {HERITAGE_SLIDES.map((slide, idx) => (
          <div
            key={slide.url}
            className={`hero-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.url})` }}
          />
        ))}
      </div>

      {/* Cinematic Deep Dark Overlay */}
      <div className="hero-overlay" />

      {/* Hero Content */}
      <div className="hero-content">
        {/* Subtle Architectural Heritage Badge */}
        <div className="heritage-pill-badge">
          <Sparkles size={13} />
          <span>India’s Food Price Intelligence</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>100% Transparent</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-headline">
          One Search. <span className="gold-gradient-text">Every Price.</span>
        </h1>

        {/* Supporting Subheading */}
        <p className="hero-subheading">
          Compare food prices across ordering platforms and find the price that works for you.
        </p>

        {/* Luxury Large Search Bar */}
        <form onSubmit={handleSubmit} className="luxury-search-wrapper">
          <Search size={22} color="var(--accent-gold)" style={{ flexShrink: 0 }} />

          <input
            ref={searchInputRef}
            type="text"
            className="luxury-search-input"
            placeholder={`Search dishes, restaurants or cuisines (e.g. ${ROTATING_PLACEHOLDERS[placeholderIndex]})...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />

          {/* Integrated Location Pill */}
          <button
            type="button"
            className="search-loc-pill"
            onClick={onOpenLocation}
            title="Change Delivery Location"
          >
            <MapPin size={14} />
            <span>{location.area || location.city}</span>
          </button>

          {/* Gold Search CTA Button */}
          <button type="submit" className="btn-gold" style={{ padding: '11px 26px', flexShrink: 0 }}>
            <span>Compare</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Dynamic Provider & Comparison Engine Status Indicator (Step 17 & Step 16) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18, minHeight: 22 }}>
          {comparisonEngineLoading ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span className="spinner" style={{ width: 10, height: 10, border: '2px solid rgba(212,175,55,0.3)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
              <span>Comparing prices across providers...</span>
            </div>
          ) : comparisonEngineError ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168, 88, 66, 0.18)', border: '1px solid rgba(168, 88, 66, 0.35)', padding: '3px 12px', borderRadius: 9999, fontSize: '0.78rem', color: '#e58e7b' }}>
              <span>{comparisonEngineError}</span>
              {onRetryEngine && (
                <button
                  type="button"
                  onClick={onRetryEngine}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-gold-light)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: 0 }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : comparisonEngineReady ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--accent-gold)', opacity: 0.9 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-emerald)', display: 'inline-block' }} />
              <span>Price comparison ready across platforms</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              window.location.href = `${getApiBaseUrl()}/integrations/swiggy/connect`;
            }}
            title="Connect your Swiggy account to fetch live menu prices and address via official Builders Club MCP"
            style={{
              background: 'rgba(252, 128, 25, 0.12)',
              border: '1px solid rgba(252, 128, 25, 0.35)',
              color: '#fc8019',
              borderRadius: 9999,
              padding: '3px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fc8019', display: 'inline-block' }} />
            <span>Connect Swiggy (Official MCP)</span>
          </button>
        </div>

        {/* Category Shortcuts Below Search Bar */}
        <div className="category-shortcuts-section">
          <div className="category-shortcuts-label">
            — What are you looking for? —
          </div>
          <div className="category-chips-row">
            {CATEGORY_SHORTCUTS.map((cat) => (
              <button
                key={cat}
                type="button"
                className="category-chip"
                onClick={() => onSelectCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

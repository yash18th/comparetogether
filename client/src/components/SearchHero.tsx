import React, { useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';

interface SearchHeroProps {
  onSearch: (q: string) => void;
  initialQuery?: string;
}

const QUICK_DISHES = [
  'Chicken Biryani',
  'Masala Dosa',
  'Paneer Butter Masala',
  'All American Burger',
  'Cold Brew Coffee',
  'Empire'
];

export const SearchHero: React.FC<SearchHeroProps> = ({ onSearch, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handlePillClick = (dish: string) => {
    setQuery(dish);
    onSearch(dish);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <section className="hero-section">
      <div className="hero-badge">
        <Sparkles size={14} />
        <span>Multi-Platform Food Price Intelligence</span>
      </div>

      <h1 className="hero-title">
        Find the <span className="hero-gradient-text">lowest price</span> for your food.
      </h1>

      <p className="hero-subtitle">
        Compare real final payable prices across Zomato, Swiggy, EatClub & direct ordering.
        Calculates food item cost, delivery, platform fees, taxes, and coupon savings.
      </p>

      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="search-container">
        <div className="search-input-wrapper">
          <Search size={20} color="var(--accent-emerald)" />
          <input
            type="text"
            className="search-input"
            placeholder="Search restaurants, dishes or cuisines (e.g. Chicken Biryani, Empire, Dosa)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // debounced or on enter
            }}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            >
              <X size={18} />
            </button>
          )}
          <button type="submit" className="btn-primary" style={{ padding: '8px 24px' }}>
            Compare
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="dish-pills">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 4 }}>Popular:</span>
          {QUICK_DISHES.map((dish) => (
            <button
              key={dish}
              type="button"
              className={`dish-pill ${query.toLowerCase() === dish.toLowerCase() ? 'active' : ''}`}
              onClick={() => handlePillClick(dish)}
            >
              {dish}
            </button>
          ))}
        </div>
      </form>
    </section>
  );
};

import React from 'react';
import { ArrowUpDown } from 'lucide-react';

interface FilterBarProps {
  category: string;
  onCategoryChange: (cat: string) => void;
  dietary: 'all' | 'veg' | 'non-veg';
  onDietaryChange: (diet: 'all' | 'veg' | 'non-veg') => void;
  priceRange: string;
  onPriceRangeChange: (pr: string) => void;
  platform: string;
  onPlatformChange: (plat: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
}

const CATEGORIES = ['All', 'Biryani', 'Curry', 'Burger', 'South Indian', 'Beverages', 'Fast Food'];
const PRICE_RANGES = [
  { label: 'All Prices', value: '' },
  { label: 'Under ₹200', value: '0-200' },
  { label: '₹200 - ₹300', value: '200-300' },
  { label: '₹300+', value: '300-9999' }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  category,
  onCategoryChange,
  dietary,
  onDietaryChange,
  priceRange,
  onPriceRangeChange,
  platform,
  onPlatformChange,
  sortBy,
  onSortByChange
}) => {
  return (
    <div className="glass-panel controls-bar">
      <div className="filter-group">
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`chip-btn ${category === cat ? 'active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dietary Switch */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          <button
            className={`chip-btn ${dietary === 'veg' ? 'active' : ''}`}
            onClick={() => onDietaryChange(dietary === 'veg' ? 'all' : 'veg')}
            style={dietary === 'veg' ? { borderColor: '#10b981', color: '#10b981' } : {}}
          >
            🟢 Veg Only
          </button>
          <button
            className={`chip-btn ${dietary === 'non-veg' ? 'active' : ''}`}
            onClick={() => onDietaryChange(dietary === 'non-veg' ? 'all' : 'non-veg')}
            style={dietary === 'non-veg' ? { borderColor: '#f43f5e', color: '#f43f5e' } : {}}
          >
            🔴 Non-Veg
          </button>
        </div>
      </div>

      {/* Right Controls: Platform, Price Range & Sorting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Platform Selector */}
        <select
          value={platform}
          onChange={(e) => onPlatformChange(e.target.value)}
          className="chip-btn"
          style={{ cursor: 'pointer', outline: 'none' }}
        >
          <option value="">All Platforms</option>
          <option value="zomato">Zomato Only</option>
          <option value="swiggy">Swiggy Only</option>
          <option value="eatclub">EatClub Only</option>
          <option value="direct">Direct Order</option>
        </select>

        {/* Price Range */}
        <select
          value={priceRange}
          onChange={(e) => onPriceRangeChange(e.target.value)}
          className="chip-btn"
          style={{ cursor: 'pointer', outline: 'none' }}
        >
          {PRICE_RANGES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {/* Sort By Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpDown size={15} color="var(--text-muted)" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="chip-btn"
            style={{ cursor: 'pointer', outline: 'none', fontWeight: 600 }}
          >
            <option value="final_price_asc">Lowest Final Price</option>
            <option value="item_price_asc">Lowest Item Price</option>
            <option value="discount_desc">Highest Savings</option>
            <option value="rating">Restaurant Rating</option>
          </select>
        </div>
      </div>
    </div>
  );
};

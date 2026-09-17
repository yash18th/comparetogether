import React from 'react';
import { Heart, ExternalLink, Scale, Sparkles } from 'lucide-react';
import type { SearchProductItem } from '../types';

interface ProductCardProps {
  item: SearchProductItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpenDetails: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  isFavorite,
  onToggleFavorite,
  onOpenDetails
}) => {
  // Find cheapest platform
  const cheapestPrice = item.prices.find(p => p.final_price === item.lowestFinalPrice && p.final_price > 0);

  return (
    <article className="product-card">
      {/* Media Header */}
      <div className="product-card-media">
        <img
          src={item.product_image}
          alt={item.product_name}
          className="product-card-img"
          loading="lazy"
        />

        {/* Badges */}
        <div className="product-card-badges">
          <span className="badge-diet" title={item.vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: item.vegetarian ? '#10b981' : '#f43f5e'
            }} />
          </span>

          {item.portion_size && item.portion_size > 0 && (
            <span className="badge-portion">
              🍽 {item.portion_size}{item.portion_unit || 'g'}
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          className="badge-fav"
          onClick={() => onToggleFavorite(item.product_id)}
          title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart size={16} fill={isFavorite ? '#f43f5e' : 'none'} color={isFavorite ? '#f43f5e' : '#ffffff'} />
        </button>
      </div>

      {/* Card Body */}
      <div className="product-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="product-title">{item.product_name}</h3>
            <div className="restaurant-info">
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.restaurant_name}</span>
              <span>•</span>
              <span>{item.branch_area}</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>★ {item.restaurant_rating}</span>
            </div>
          </div>
        </div>

        {/* Portion Normalization per 100g */}
        {item.pricePer100g && item.pricePer100g > 0 && (
          <div className="portion-highlight">
            <Scale size={13} />
            <span>Normalized: <strong>₹{item.pricePer100g}</strong> per 100g</span>
          </div>
        )}

        {/* Multi-Platform Comparison Strip */}
        <div className="platform-comparison-strip">
          {item.prices.map((p) => {
            const isCheapest = p.final_price === item.lowestFinalPrice && p.final_price > 0;

            return (
              <div
                key={p.id}
                className={`platform-row ${isCheapest ? 'cheapest' : ''}`}
              >
                <div className="platform-name-tag">
                  <img
                    src={p.platform_logo}
                    alt={p.platform_name}
                    style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }}
                  />
                  <span>{p.platform_name}</span>
                  {p.membership_applied && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', padding: '1px 5px', borderRadius: 4 }}>
                      VIP
                    </span>
                  )}
                </div>

                <div className="platform-price-numbers">
                  <div className="final-price-tag" style={{ color: isCheapest ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                    ₹{p.final_price}
                  </div>
                  <div className="item-price-subtext">
                    ₹{p.item_price} + ₹{p.delivery_fee} del
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Savings Badge */}
        {item.maxSavings > 0 && (
          <div className="savings-banner">
            <Sparkles size={14} />
            <span>You save <strong>₹{item.maxSavings}</strong> vs highest platform</span>
          </div>
        )}

        {/* Actions */}
        <div className="card-actions">
          <button
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.85rem' }}
            onClick={() => onOpenDetails(item.product_id)}
          >
            Compare Details
          </button>

          {cheapestPrice && (
            <a
              href={cheapestPrice.order_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ flex: 1, fontSize: '0.85rem', textDecoration: 'none' }}
            >
              <span>Order on {cheapestPrice.platform_name.split(' ')[0]}</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

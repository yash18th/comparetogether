import { Sparkles, ArrowRight, Scale } from 'lucide-react';

interface PriceComparisonPreviewProps {
  onStartLiveCompare: () => void;
}

export const PriceComparisonPreview: React.FC<PriceComparisonPreviewProps> = ({ onStartLiveCompare }) => {
  return (
    <section className="showcase-container" style={{ padding: '20px 20px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="showcase-demo-badge">
          <Sparkles size={13} />
          <span>Interactive Comparison Preview</span>
        </div>
        <h2 className="font-heritage" style={{ fontSize: 'clamp(1.7rem, 3.2vw, 2.4rem)', marginBottom: 8 }}>
          See the Difference <span className="gold-gradient-text">Side-by-Side</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 540, margin: '0 auto' }}>
          Notice how the platform with the cheapest item price is not always the lowest final payable total.
        </p>
      </div>

      {/* Heritage Framed Preview Card */}
      <div className="heritage-frame" style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="font-heritage" style={{ fontSize: '1.45rem', fontWeight: 700 }}>
                Chicken Biryani
              </h3>
              <span className="badge-portion">🍽 500g</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 2 }}>
              Empire Restaurant • Indiranagar Branch
            </p>
          </div>

          <div className="portion-highlight" style={{ margin: 0 }}>
            <Scale size={14} />
            <span>Normalized: <strong>₹36.8</strong> per 100g</span>
          </div>
        </div>

        {/* Platform Strip */}
        <div className="platform-comparison-strip" style={{ padding: '14px', gap: 12 }}>
          {/* Zomato */}
          <div className="platform-row" style={{ padding: '8px 12px' }}>
            <div className="platform-name-tag">
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Zomato</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Listed: ₹220</span>
            </div>
            <div className="platform-price-numbers">
              <div className="final-price-tag" style={{ fontSize: '1.05rem' }}>₹248</div>
              <div className="item-price-subtext">Delivery ₹28 + Fees ₹8 + Tax ₹12 − Disc ₹35</div>
            </div>
          </div>

          {/* Swiggy */}
          <div className="platform-row" style={{ padding: '8px 12px' }}>
            <div className="platform-name-tag">
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Swiggy</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Listed: ₹205</span>
            </div>
            <div className="platform-price-numbers">
              <div className="final-price-tag" style={{ fontSize: '1.05rem' }}>₹232</div>
              <div className="item-price-subtext">Delivery ₹22 + Fees ₹7 + Tax ₹11 − Disc ₹30</div>
            </div>
          </div>

          {/* EatClub */}
          <div className="platform-row cheapest" style={{ padding: '8px 12px' }}>
            <div className="platform-name-tag">
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-gold-light)' }}>
                EatClub
              </span>
              <span style={{
                fontSize: '0.68rem',
                background: 'rgba(197, 160, 89, 0.2)',
                color: 'var(--accent-gold-light)',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 700
              }}>
                BEST TOTAL
              </span>
            </div>
            <div className="platform-price-numbers">
              <div className="final-price-tag" style={{ fontSize: '1.15rem', color: 'var(--accent-gold-light)' }}>
                ₹184
              </div>
              <div className="item-price-subtext" style={{ color: 'var(--accent-gold)' }}>
                Free Delivery + 0 Platform Fee + ₹40 Club Savings
              </div>
            </div>
          </div>

          {/* Direct Restaurant Order */}
          <div className="platform-row" style={{ padding: '8px 12px' }}>
            <div className="platform-name-tag">
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Direct Order</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Merchant Web/Call</span>
            </div>
            <div className="platform-price-numbers">
              <div className="final-price-tag" style={{ fontSize: '1.05rem' }}>₹220</div>
              <div className="item-price-subtext">0% Intermediary Fee + 10% Direct Patron Discount</div>
            </div>
          </div>
        </div>

        {/* Dynamic Savings Highlight */}
        <div className="savings-banner" style={{ marginTop: 14, padding: '10px 16px' }}>
          <Sparkles size={16} />
          <span>
            <strong>You save ₹64</strong> on this order compared with the highest available total.
          </span>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <button className="btn-gold" style={{ width: '100%', maxWidth: 320 }} onClick={onStartLiveCompare}>
            <span>Compare Live Dishes Now</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

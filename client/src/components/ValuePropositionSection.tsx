import { ShieldCheck, Receipt, Percent } from 'lucide-react';

export const ValuePropositionSection: React.FC = () => {
  return (
    <section style={{ padding: '30px 20px', maxWidth: 1040, margin: '0 auto' }}>
      <div className="value-prop-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="heritage-pill-badge" style={{ marginBottom: 14 }}>
            <ShieldCheck size={14} />
            <span>Real Cost Transparency</span>
          </div>

          <h2 className="font-heritage" style={{ fontSize: 'clamp(1.7rem, 3.2vw, 2.5rem)', marginBottom: 12 }}>
            The price you see isn't always <span className="gold-gradient-text">the price you pay.</span>
          </h2>

          <p style={{ color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto', fontSize: '1.02rem', lineHeight: 1.6 }}>
            Online menus often lure customers with lower listed item prices, only to add high packaging charges, delivery surges, and platform fees at checkout.
          </p>
        </div>

        {/* Visual Line-Item Formula Strip */}
        <div className="formula-strip">
          <span className="formula-tag">Item Price</span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>+</span>
          <span className="formula-tag">Delivery Fee</span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>+</span>
          <span className="formula-tag">Platform Fee</span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>+</span>
          <span className="formula-tag">Packaging</span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>+</span>
          <span className="formula-tag">Taxes</span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>−</span>
          <span className="formula-tag" style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            Discounts
          </span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>=</span>
          <span className="formula-tag highlight">
            Final Payable Price
          </span>
        </div>

        {/* Value Points */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 32 }}>
          <div className="glass-panel" style={{ padding: 22 }}>
            <Receipt size={22} color="var(--accent-gold)" style={{ marginBottom: 10 }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Zero Hidden Checkout Surprises</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              We compute the true final payable total upfront, incorporating distance-based delivery fees and packaging line items before you order.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 22 }}>
            <Percent size={22} color="var(--accent-gold)" style={{ marginBottom: 10 }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Automated Coupon Detection</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Applicable restaurant vouchers, platform coupons, and VIP membership perks (Swiggy One / Zomato Gold) are compared simultaneously.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 22 }}>
            <ShieldCheck size={22} color="var(--accent-gold)" style={{ marginBottom: 10 }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>100% Legal & Source-Backed</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              All comparisons are derived from authorized partner feeds, merchant menus, and official integrations with no terms-of-service violations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

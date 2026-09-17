import { Bell, ArrowRight } from 'lucide-react';

interface PriceAlertFeatureSectionProps {
  onTriggerAlertDemo: () => void;
}

export const PriceAlertFeatureSection: React.FC<PriceAlertFeatureSectionProps> = ({ onTriggerAlertDemo }) => {
  return (
    <section style={{ padding: '30px 20px', maxWidth: 940, margin: '0 auto' }}>
      <div className="glass-panel heritage-frame" style={{ padding: '36px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-gold)', marginBottom: 8 }}>
              <Bell size={18} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Smart Price Intelligence
              </span>
            </div>

            <h3 className="font-heritage" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', marginBottom: 12 }}>
              Get notified when your <span className="gold-gradient-text">favourite food</span> gets cheaper.
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Set custom price alert thresholds for your go-to biryanis, pizzas, or burgers. Our system monitors verified restaurant rates across platforms and alerts you the moment prices drop below your target.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 260 }}>
            <div style={{
              background: 'var(--bg-glass-gold)',
              border: '1px solid var(--border-glass)',
              borderRadius: 12,
              padding: '14px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Typical User Savings</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-gold)' }}>₹40 – ₹120</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold-light)' }}>saved per order</div>
            </div>

            <button className="btn-gold" onClick={onTriggerAlertDemo}>
              <span>Set a Price Alert</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

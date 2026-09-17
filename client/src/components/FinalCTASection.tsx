import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface FinalCTASectionProps {
  onStartComparing: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onStartComparing }) => {
  return (
    <section className="heritage-cta-section">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="heritage-pill-badge" style={{ marginBottom: 16 }}>
          <Sparkles size={13} />
          <span>Start Saving on Every Meal</span>
        </div>

        <h2 className="font-heritage" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: 14 }}>
          Ready to <span className="gold-gradient-text">compare?</span>
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 30, lineHeight: 1.6 }}>
          Join thousands of smart foodies across Bengaluru, Mumbai, and Delhi who check FoodCompare before placing their food delivery orders.
        </p>

        <button className="btn-gold" style={{ padding: '14px 38px', fontSize: '1.05rem' }} onClick={onStartComparing}>
          <span>Start Comparing</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
};

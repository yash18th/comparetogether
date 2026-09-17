import React from 'react';
import { Search, Scale, ExternalLink } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" style={{ padding: '40px 20px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 className="font-heritage" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', marginBottom: 12 }}>
          How <span className="gold-gradient-text">FoodCompare</span> Works
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 580, margin: '0 auto', fontSize: '1.05rem' }}>
          Three simple steps to ensure you never overpay for your favourite meals.
        </p>
      </div>

      <div className="steps-grid">
        {/* Step 1 */}
        <div className="step-card">
          <div className="step-number">01</div>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--bg-glass-gold)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-gold)',
            marginBottom: 16
          }}>
            <Search size={22} />
          </div>
          <h3 className="step-title">Search</h3>
          <p className="step-desc">
            Find the food, dish or restaurant you're looking for with instant typo-tolerance and branch-aware delivery lookup.
          </p>
        </div>

        {/* Step 2 */}
        <div className="step-card">
          <div className="step-number">02</div>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--bg-glass-gold)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-gold)',
            marginBottom: 16
          }}>
            <Scale size={22} />
          </div>
          <h3 className="step-title">Compare</h3>
          <p className="step-desc">
            See transparent prices, delivery charges, packaging, taxes, platform fees, and coupon discounts across all supported platforms.
          </p>
        </div>

        {/* Step 3 */}
        <div className="step-card">
          <div className="step-number">03</div>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--bg-glass-gold)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-gold)',
            marginBottom: 16
          }}>
            <ExternalLink size={22} />
          </div>
          <h3 className="step-title">Choose</h3>
          <p className="step-desc">
            Pick the platform offering the lowest checkout total or fastest delivery, and open the official ordering page in one click.
          </p>
        </div>
      </div>
    </section>
  );
};

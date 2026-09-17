import React, { useEffect, useState, useCallback } from 'react';
import { X, ExternalLink, Bell, Scale, ShieldCheck, Sparkles, MapPin, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import type { ComparisonData } from '../types';
import { PriceHistoryChart } from './PriceHistoryChart';
import { PriceAlertModal } from './PriceAlertModal';
import { useMembership } from '../context/MembershipContext';

interface ComparisonModalProps {
  productId: string;
  onClose: () => void;
  onSwitchProduct?: (newProductId: string) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  productId,
  onClose
}) => {
  const { hasMembership } = useMembership();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  const fetchComparison = useCallback(async () => {
    if (!productId) {
      onClose();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.getComparison(productId, hasMembership);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Price comparison data is temporarily unavailable for this dish.');
    } finally {
      setLoading(false);
    }
  }, [productId, hasMembership, onClose]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: 500, padding: 32, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button className="btn-secondary" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '3px solid var(--border-glass)',
            borderTopColor: 'var(--accent-gold)',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <h4 className="font-heritage" style={{ fontSize: '1.2rem', marginBottom: 8 }}>Comparing Platform Prices</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Aggregating live line-item prices across Zomato, Swiggy, EatClub, and Direct merchant menus...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: 500, padding: 32, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button className="btn-secondary" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
          <h4 className="font-heritage" style={{ fontSize: '1.2rem', color: 'var(--accent-gold)', marginBottom: 8 }}>Comparison Temporarily Unavailable</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>
            {error || 'Unable to retrieve multi-platform pricing at this moment.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={onClose}>Close</button>
            <button className="btn-gold" onClick={fetchComparison}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const { product, prices, comparison, priceHistory, averagePrice30d, matches, otherBranches } = data;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{product.product_name}</h2>
                <span className="badge-portion">
                  {product.portion_size}{product.portion_unit}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="var(--accent-emerald)" />
                <strong>{product.restaurant_name}</strong> — {product.branch_name} ({product.branch_area})
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                onClick={() => setShowAlertModal(true)}
              >
                <Bell size={14} color="var(--accent-amber)" />
                <span>Price Alert</span>
              </button>

              <button className="btn-secondary" style={{ width: 34, height: 34, padding: 0 }} onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Top Savings & Portion Banner */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {comparison.maxSavings > 0 && (
                <div className="savings-banner" style={{ flex: 1, margin: 0, padding: '10px 16px' }}>
                  <Sparkles size={16} />
                  <span>
                    <strong>{comparison.savingsText}</strong> By choosing {comparison.cheapestPlatformCode.toUpperCase()}, you keep more money in your wallet!
                  </span>
                </div>
              )}

              {comparison.portionComparison && (
                <div className="portion-highlight" style={{ flex: 1, margin: 0, padding: '10px 16px', fontSize: '0.88rem' }}>
                  <Scale size={16} />
                  <span>
                    Normalized Quantity: <strong>₹{comparison.portionComparison.cheapestPer100g}</strong> per 100{product.portion_unit || 'g'} on {comparison.portionComparison.platformCode.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Comprehensive Line-Item Fee Breakdown Table */}
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--accent-emerald)" />
                <span>Transparent Item & Fee Breakdown</span>
              </h3>

              {prices.length === 0 ? (
                <div className="glass-panel" style={{ padding: 24, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: '0.95rem' }}>
                    No live platform pricing is currently mapped for this dish yet.
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Our matching engine indexes new restaurant menus and platform pricing continuously.
                  </p>
                </div>
              ) : (
                <div className="breakdown-table-wrapper glass-panel">
                  <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Fee Component</th>
                      {prices.map(p => (
                        <th key={p.id} style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <img src={p.platform_logo} alt={p.platform_name} style={{ width: 16, height: 16, borderRadius: 3 }} />
                            <span>{p.platform_name}</span>
                          </div>
                          {p.data_provenance === 'INTEGRATION_PENDING' ? (
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', display: 'block', fontWeight: 600, opacity: 0.9 }}>
                              Integration Pending
                            </span>
                          ) : p.data_provenance === 'LIVE' ? (
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', display: 'block', fontWeight: 600 }}>
                              Live Verified
                            </span>
                          ) : p.data_provenance === 'AUTHORIZED' ? (
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', display: 'block', fontWeight: 600 }}>
                              Official Partner
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 400 }}>
                              Unavailable
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Base Item Listed Price</td>
                      {prices.map(p => (
                        <td key={p.id} style={{ textAlign: 'right', fontWeight: 600 }}>₹{p.item_price}</td>
                      ))}
                    </tr>
                    <tr>
                      <td>Delivery Charge</td>
                      {prices.map(p => (
                        <td key={p.id} style={{ textAlign: 'right' }}>
                          {p.final_price_unavailable ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : p.delivery_fee === 0 ? (
                            <span style={{ color: 'var(--accent-emerald)' }}>FREE</span>
                          ) : (
                            `₹${p.delivery_fee}`
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Platform Fee</td>
                      {prices.map(p => (
                        <td key={p.id} style={{ textAlign: 'right' }}>
                          {p.final_price_unavailable ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : p.platform_fee === 0 ? (
                            <span style={{ color: 'var(--accent-emerald)' }}>₹0</span>
                          ) : (
                            `₹${p.platform_fee}`
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Restaurant Packaging</td>
                      {prices.map(p => (
                        <td key={p.id} style={{ textAlign: 'right' }}>
                          {p.final_price_unavailable ? (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : p.packaging_fee === 0 ? (
                            '₹0'
                          ) : (
                            `₹${p.packaging_fee}`
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Government Taxes (GST)</td>
                      {prices.map(p => (
                        <td key={p.id} style={{ textAlign: 'right' }}>
                          {p.final_price_unavailable ? <span style={{ color: 'var(--text-muted)' }}>—</span> : `₹${p.taxes}`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Discounts & Coupons</td>
                      {prices.map(p => (
                        <td key={p.id} style={{ textAlign: 'right', color: 'var(--accent-emerald)' }}>
                          {p.final_price_unavailable ? <span style={{ color: 'var(--text-muted)' }}>—</span> : p.discount > 0 ? `−₹${p.discount}` : '₹0'}
                        </td>
                      ))}
                    </tr>
                    {hasMembership && (
                      <tr>
                        <td>Membership Benefit Applied</td>
                        {prices.map(p => (
                          <td key={p.id} style={{ textAlign: 'right', color: 'var(--accent-amber)', fontWeight: 600 }}>
                            {p.membership_applied ? `−₹${p.active_membership_discount || p.membership_discount}` : '—'}
                          </td>
                        ))}
                      </tr>
                    )}
                    <tr className="total-row">
                      <td>Final Payable Price</td>
                      {prices.map(p => {
                        if (p.final_price_unavailable) {
                          return (
                            <td key={p.id} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Final price unavailable</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--accent-sandstone)', opacity: 0.75 }}>
                                Live checkout session required
                              </div>
                            </td>
                          );
                        }
                        const isCheapest = p.final_price === comparison.cheapestFinalPrice && comparison.cheapestFinalPrice > 0;
                        return (
                          <td key={p.id} style={{ textAlign: 'right', color: isCheapest ? 'var(--accent-emerald)' : 'inherit' }}>
                            ₹{p.final_price}
                            {isCheapest && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                                Lowest Total!
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td>Direct Order Action</td>
                      {prices.map(p => (
                        <td key={p.id} style={{ textAlign: 'right' }}>
                          <a
                            href={p.order_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{
                              fontSize: '0.78rem',
                              padding: '6px 12px',
                              textDecoration: 'none',
                              display: 'inline-flex'
                            }}
                          >
                            <span>Order</span>
                            <ExternalLink size={12} />
                          </a>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            </div>

            {/* Price History Section */}
            <PriceHistoryChart
              history={priceHistory}
              averagePrice30d={averagePrice30d}
              lastUpdated={prices[0]?.last_updated_human || '8 minutes ago'}
            />

            {/* Product Matching Engine Confidence Verification */}
            {matches.length > 0 && (
              <div className="glass-panel" style={{ padding: 16 }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={16} color="var(--accent-emerald)" />
                  <span>Matching Engine Verification</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {matches.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Matched on <strong>{m.platform_name}</strong> as <em>"{m.platform_item_name}"</em>
                      </span>
                      <span className="confidence-meter confidence-high">
                        {Math.round(m.confidence_score * 100)}% Match Confidence ({m.verification_status})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Branches */}
            {otherBranches.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Also available at other {product.restaurant_name} branches:
                </h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {otherBranches.map(b => (
                    <span
                      key={b.branch_id}
                      className="chip-btn"
                      style={{ fontSize: '0.8rem' }}
                    >
                      {b.branch_name} ({b.area})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price Alert Modal Sub-component */}
      {showAlertModal && (
        <PriceAlertModal
          productId={product.product_id}
          productName={product.product_name}
          currentLowestPrice={comparison.cheapestFinalPrice}
          onClose={() => setShowAlertModal(false)}
          onAlertCreated={() => {
            alert('Price drop alert registered! We will track it on your dashboard.');
          }}
        />
      )}
    </>
  );
};

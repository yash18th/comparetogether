import React, { useState } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PriceAlertModalProps {
  productId: string;
  productName: string;
  currentLowestPrice: number;
  onClose: () => void;
  onAlertCreated: () => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  productId,
  productName,
  currentLowestPrice,
  onClose,
  onAlertCreated
}) => {
  const { user } = useAuth();
  const [targetPrice, setTargetPrice] = useState<number>(Math.round(currentLowestPrice * 0.85));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to set price alerts');
      return;
    }
    if (targetPrice >= currentLowestPrice) {
      setError('Target price must be lower than current lowest price (₹' + currentLowestPrice + ')');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await api.createAlert(productId, targetPrice);
      setIsSuccess(true);
      setTimeout(() => {
        onAlertCreated();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to set alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Set Price Drop Alert</h3>
          </div>
          <button className="btn-secondary" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle2 size={48} color="var(--accent-emerald)" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>Alert Activated!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                We'll notify you as soon as {productName} drops below ₹{targetPrice}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 4 }}>
                  Item: <strong style={{ color: 'var(--text-primary)' }}>{productName}</strong>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Current Best Price: <strong style={{ color: 'var(--accent-emerald)' }}>₹{currentLowestPrice}</strong>
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Alert me when price drops below (₹):
                </label>
                <input
                  type="number"
                  className="search-input"
                  style={{
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    width: '100%',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--accent-emerald)'
                  }}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  min={50}
                  max={currentLowestPrice - 1}
                  required
                />
              </div>

              {error && (
                <div style={{ color: 'var(--accent-rose)', fontSize: '0.82rem' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Set Alert'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

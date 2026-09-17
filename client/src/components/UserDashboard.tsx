import React, { useEffect, useState } from 'react';
import { Heart, Bell, History, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import type { FavoriteItem, PriceAlert } from '../types';
import { useAuth } from '../context/AuthContext';

interface UserDashboardProps {
  onOpenProduct: (productId: string) => void;
  onBackToSearch: () => void;
  initialTab?: 'favorites' | 'alerts' | 'history';
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onOpenProduct, onBackToSearch, initialTab = 'favorites' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'favorites' | 'alerts' | 'history'>(initialTab);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [favs, alrts, hist] = await Promise.all([
        api.getFavorites(),
        api.getAlerts(),
        api.getSearchHistory()
      ]);
      setFavorites(favs);
      setAlerts(alrts);
      setHistory(hist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteAlert = async (alertId: string) => {
    await api.deleteAlert(alertId);
    setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
  };

  const handleRemoveFavorite = async (productId: string) => {
    await api.toggleFavorite(productId);
    setFavorites(prev => prev.filter(f => f.product_id !== productId));
  };

  return (
    <div style={{ maxWidth: 1000, margin: '32px auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>User Account & Insights</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Logged in as <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        <button className="btn-secondary" onClick={onBackToSearch}>
          ← Back to Search
        </button>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`dash-tab ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Heart size={16} />
          <span>Saved Dishes ({favorites.length})</span>
        </button>
        <button
          className={`dash-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Bell size={16} />
          <span>Price Drop Alerts ({alerts.length})</span>
        </button>
        <button
          className={`dash-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>Recent Searches ({history.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading your personalized insights...
        </div>
      ) : activeTab === 'favorites' ? (
        <div>
          {favorites.length === 0 ? (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
              <Heart size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No saved food items yet</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Click the heart icon on any food item to track prices here.
              </p>
              <button className="btn-primary" onClick={onBackToSearch}>
                Browse Dishes
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {favorites.map(f => (
                <div key={f.favorite_id} className="glass-panel" style={{ padding: 16 }}>
                  <img
                    src={f.image}
                    alt={f.product_name}
                    style={{ width: '100%', height: 140, borderRadius: 10, objectFit: 'cover', marginBottom: 12 }}
                  />
                  <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{f.product_name}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {f.restaurant_name} • {f.branch_area}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      Best: ₹{f.best_price}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => onOpenProduct(f.product_id)}
                      >
                        Compare
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 10px', color: 'var(--accent-rose)' }}
                        onClick={() => handleRemoveFavorite(f.product_id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'alerts' ? (
        <div>
          {alerts.length === 0 ? (
            <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
              <Bell size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No active price drop alerts</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                Open any item and click "Price Alert" to be notified when prices fall!
              </p>
              <button className="btn-primary" onClick={onBackToSearch}>
                Find Food Items
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map(a => {
                const isMet = a.current_best_price <= a.target_price;

                return (
                  <div
                    key={a.alert_id}
                    className="glass-panel"
                    style={{
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${isMet ? 'var(--accent-emerald)' : 'var(--accent-amber)'}`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{a.product_name}</h4>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontWeight: 600,
                          background: isMet ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isMet ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                        }}>
                          {isMet ? 'TARGET MET!' : 'MONITORING'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {a.restaurant_name} ({a.branch_area})
                      </div>
                      <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                        Alert Target: <strong>₹{a.target_price}</strong> | Current Lowest: <strong style={{ color: 'var(--accent-emerald)' }}>₹{a.current_best_price}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                        onClick={() => onOpenProduct(a.product_id)}
                      >
                        View Prices
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 12px', color: 'var(--accent-rose)' }}
                        onClick={() => handleDeleteAlert(a.alert_id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 20 }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>Recent Search Queries</h4>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No recent searches recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(h => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--bg-glass)',
                    fontSize: '0.9rem'
                  }}
                >
                  <div>
                    <strong>"{h.query}"</strong> in <span style={{ color: 'var(--text-secondary)' }}>{h.location}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

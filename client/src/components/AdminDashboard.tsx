import React, { useEffect, useState } from 'react';
import { Settings, Check, X, Cpu, Database, Plus, Store } from 'lucide-react';
import { api } from '../services/api';
import type { Platform } from '../types';

interface AdminDashboardProps {
  onBackToSearch: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToSearch }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Match test form
  const [testSource, setTestSource] = useState('Chicken Dum Biryani');
  const [testTarget, setTestTarget] = useState('Chicken Biryani Bowl');
  const [testCategory, setTestCategory] = useState('Biryani');
  const [testVeg, setTestVeg] = useState(false);
  const [testPortion1, setTestPortion1] = useState(500);
  const [testPortion2, setTestPortion2] = useState(500);
  const [algorithmResult, setAlgorithmResult] = useState<any>(null);

  const [swiggyStatus, setSwiggyStatus] = useState<any>(null);
  const [swiggyActionLoading, setSwiggyActionLoading] = useState(false);

  // New Branch Form
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchRestId, setNewBranchRestId] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchArea, setNewBranchArea] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('Bangalore');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [met, mtch, plats, restData, swiggyData] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminMatches(),
        api.getAdminPlatforms(),
        api.getAdminRestaurants(),
        api.getSwiggyStatus()
      ]);
      setMetrics(met);
      setMatches(mtch);
      setPlatforms(plats);
      setRestaurants(restData.restaurants || []);
      setBranches(restData.branches || []);
      setSwiggyStatus(swiggyData);
      if (restData.restaurants?.length > 0) {
        setNewBranchRestId(restData.restaurants[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleUpdateMatchStatus = async (matchId: string, status: string) => {
    await api.updateMatchStatus(matchId, status);
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, verification_status: status } : m));
  };

  const handleUpdatePlatformStatus = async (platformId: string, status: string) => {
    await api.updatePlatformStatus(platformId, status);
    setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, integration_status: status as any } : p));
  };

  const handleConnectSwiggy = async () => {
    setSwiggyActionLoading(true);
    try {
      const url = await api.getSwiggyConnectUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      alert(`Could not initiate Swiggy OAuth: ${err?.message || err}`);
    } finally {
      setSwiggyActionLoading(false);
    }
  };

  const handleDisconnectSwiggy = async () => {
    if (!confirm('Disconnect Swiggy MCP and clear active OAuth session?')) return;
    setSwiggyActionLoading(true);
    try {
      await api.disconnectSwiggy();
      const updated = await api.getSwiggyStatus();
      setSwiggyStatus(updated);
    } catch (err: any) {
      alert(`Could not disconnect Swiggy: ${err?.message || err}`);
    } finally {
      setSwiggyActionLoading(false);
    }
  };

  const handleRunAlgorithmTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.testMatchingAlgorithm({
      sourceName: testSource,
      targetName: testTarget,
      sourceVeg: testVeg,
      targetVeg: testVeg,
      sourcePortion: Number(testPortion1),
      targetPortion: Number(testPortion2),
      category: testCategory
    });
    setAlgorithmResult(res.data);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchRestId || !newBranchName || !newBranchArea) return;
    await api.createBranch({
      restaurantId: newBranchRestId,
      name: newBranchName,
      area: newBranchArea,
      city: newBranchCity,
      address: `${newBranchArea} Main Road, ${newBranchCity}`,
      pincode: '560001'
    });
    alert('Branch created successfully!');
    setShowAddBranch(false);
    loadAdminData();
  };

  return (
    <div style={{ maxWidth: 1100, margin: '32px auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={26} color="var(--accent-emerald)" />
            <span>Admin Control & Engine Operations</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Catalog management, low-confidence match queue, and adapter status monitoring.
          </p>
        </div>

        <button className="btn-secondary" onClick={onBackToSearch}>
          ← Exit Admin
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading Admin telemetry...
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          {metrics && (
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-number">{metrics.restaurantCount}</div>
                <div className="metric-label">Restaurants</div>
              </div>
              <div className="metric-card">
                <div className="metric-number">{metrics.branchCount}</div>
                <div className="metric-label">Active Branches</div>
              </div>
              <div className="metric-card">
                <div className="metric-number">{metrics.productCount}</div>
                <div className="metric-label">Menu Items</div>
              </div>
              <div className="metric-card">
                <div className="metric-number" style={{ color: 'var(--accent-amber)' }}>{metrics.pendingMatchCount}</div>
                <div className="metric-label">Pending Match Reviews</div>
              </div>
              <div className="metric-card">
                <div className="metric-number" style={{ color: 'var(--accent-cyan)' }}>{metrics.searchCount}</div>
                <div className="metric-label">Logged Searches</div>
              </div>
            </div>
          )}

          {/* 1. Low-Confidence Product Matching Review Queue */}
          <div className="glass-panel" style={{ padding: 20, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={18} color="var(--accent-amber)" />
                  <span>Product Match Verification Queue</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Intelligent matching engine matches cross-platform items. Items with moderate confidence score require human validation.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matches.map(m => {
                const confPercent = Math.round(m.confidence_score * 100);
                const isHigh = confPercent >= 80;
                const isLow = confPercent < 70;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-glass)',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        Source: <span style={{ color: 'var(--accent-cyan)' }}>{m.product_name}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Matched with {m.platform_name}: <em>"{m.platform_item_name}"</em> ({m.restaurant_name} - {m.branch_area})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className={`confidence-meter ${isHigh ? 'confidence-high' : isLow ? 'confidence-low' : 'confidence-medium'}`}>
                        {confPercent}% Match Score ({m.verification_status})
                      </span>

                      {m.verification_status !== 'verified' && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' }}
                          onClick={() => handleUpdateMatchStatus(m.id, 'verified')}
                        >
                          <Check size={14} />
                          <span>Approve Match</span>
                        </button>
                      )}

                      {m.verification_status !== 'rejected' && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                          onClick={() => handleUpdateMatchStatus(m.id, 'rejected')}
                        >
                          <X size={14} />
                          <span>Reject (Separate)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Interactive Matching Algorithm Sandbox */}
          <div className="glass-panel" style={{ padding: 20, marginBottom: 28 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={18} color="var(--accent-cyan)" />
              <span>Matching Algorithm Simulator</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Test tokenization, Sørensen–Dice character bigrams, and dietary compatibility guards in real-time.
            </p>

            <form onSubmit={handleRunAlgorithmTest} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dish Name 1 (e.g. Zomato)</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                  value={testSource}
                  onChange={(e) => setTestSource(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dish Name 2 (e.g. Swiggy)</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                  value={testTarget}
                  onChange={(e) => setTestTarget(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Portion Disparity (g)</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    className="search-input"
                    style={{ width: '50%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                    value={testPortion1}
                    onChange={(e) => setTestPortion1(Number(e.target.value))}
                  />
                  <input
                    type="number"
                    className="search-input"
                    style={{ width: '50%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                    value={testPortion2}
                    onChange={(e) => setTestPortion2(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Category</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
                <input
                  type="checkbox"
                  id="testVegCheck"
                  checked={testVeg}
                  onChange={(e) => setTestVeg(e.target.checked)}
                />
                <label htmlFor="testVegCheck" style={{ fontSize: '0.85rem' }}>Vegetarian Dish</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  Compute Confidence
                </button>
              </div>
            </form>

            {algorithmResult && (
              <div style={{ marginTop: 16, padding: 14, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: algorithmResult.isMatch ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {Math.round(algorithmResult.confidence * 100)}% Confidence
                  </span>
                  <span className={`confidence-meter ${algorithmResult.isMatch ? 'confidence-high' : 'confidence-low'}`}>
                    {algorithmResult.isMatch ? 'AUTO-MATCH' : algorithmResult.needsReview ? 'REQUIRES REVIEW' : 'HARD MISMATCH'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <strong>Matched Tokens:</strong> {algorithmResult.matchedTokens.join(', ') || 'None'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  <strong>Rules Evaluated:</strong> {algorithmResult.reasons.join(' • ') || 'Calculated purely via keyword tokens'}
                </div>
              </div>
            )}
          </div>

          {/* 3. Platform Integrations Manager */}
          <div className="glass-panel" style={{ padding: 20, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Database size={18} color="var(--accent-emerald)" />
                  <span>Platform Adapter Integrations</span>
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Manages live platform authorization contracts. Swiggy uses official Model Context Protocol (MCP) via OAuth 2.1 + PKCE.
                </p>
              </div>
            </div>

            {/* Official Swiggy MCP Live Connector Banner */}
            <div className="glass-panel" style={{
              padding: 16,
              marginBottom: 18,
              border: swiggyStatus?.connected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-glass)',
              background: swiggyStatus?.connected ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <img
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=80&fit=crop"
                    alt="Swiggy"
                    style={{ width: 42, height: 42, borderRadius: 8 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>Swiggy Builders Club / Food MCP</span>
                      <span className={`status-pill ${swiggyStatus?.connected ? 'status-authorized' : 'status-pending'}`} style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background: swiggyStatus?.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(197, 160, 89, 0.2)',
                        color: swiggyStatus?.connected ? 'var(--accent-emerald)' : 'var(--accent-gold)'
                      }}>
                        {swiggyStatus?.connected ? '● LIVE AUTHORIZED' : '○ INTEGRATION PENDING'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Authentication: <strong>OAuth 2.1 with PKCE</strong> • Scope: <code>food</code> • Endpoint: <code>https://mcp.swiggy.com/food</code>
                    </div>
                    {swiggyStatus?.connected && swiggyStatus.address && (
                      <div style={{ fontSize: '0.80rem', color: 'var(--accent-emerald)', marginTop: 4 }}>
                        Synced Delivery Address: <strong>{swiggyStatus.address.formattedAddress || swiggyStatus.address.area || swiggyStatus.address.id}</strong> (from official <code>get_addresses</code> tool)
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {swiggyStatus?.connected ? (
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '7px 16px', color: 'var(--accent-rose)' }}
                      onClick={handleDisconnectSwiggy}
                      disabled={swiggyActionLoading}
                    >
                      {swiggyActionLoading ? 'Disconnecting...' : 'Disconnect Swiggy'}
                    </button>
                  ) : (
                    <button
                      className="btn-gold"
                      style={{ fontSize: '0.82rem', padding: '7px 18px' }}
                      onClick={handleConnectSwiggy}
                      disabled={swiggyActionLoading}
                    >
                      {swiggyActionLoading ? 'Redirecting...' : 'Connect Swiggy MCP (OAuth 2.1 + PKCE)'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Official Zomato Enterprise Integration Banner */}
            <div className="glass-panel" style={{
              padding: 16,
              marginBottom: 18,
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <img
                    src="https://images.unsplash.com/photo-1526367790999-0150786686a2?w=80&h=80&fit=crop"
                    alt="Zomato"
                    style={{ width: 42, height: 42, borderRadius: 8 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>Zomato Merchant Partner API</span>
                      <span className="status-pill status-pending" style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background: 'rgba(197, 160, 89, 0.2)',
                        color: 'var(--accent-gold)'
                      }}>
                        ○ INTEGRATION PENDING
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Authentication: <strong>Enterprise API Key (Server-Side)</strong> • Env: <code>ZOMATO_API_KEY</code> & <code>ZOMATO_BASE_URL</code>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Zomato restricts checkout quoting to approved POS/Merchant partners. Zero simulated prices are generated when keys are unconfigured.
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--accent-sandstone)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 6 }}>
                  Server Environment Required
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {platforms.map(p => (
                <div key={p.id} className="glass-panel" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <img src={p.logo_url} alt={p.name} style={{ width: 28, height: 28, borderRadius: 6 }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {p.code}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', marginBottom: 12 }}>
                    Status: <strong style={{ textTransform: 'capitalize', color: p.integration_status === 'authorized' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {p.integration_status}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`chip-btn ${p.integration_status === 'authorized' ? 'active' : ''}`}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '4px' }}
                      onClick={() => handleUpdatePlatformStatus(p.id, 'authorized')}
                    >
                      Authorized
                    </button>
                    <button
                      className={`chip-btn ${p.integration_status === 'partner_feed' ? 'active' : ''}`}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '4px' }}
                      onClick={() => handleUpdatePlatformStatus(p.id, 'partner_feed')}
                    >
                      Partner Feed
                    </button>
                    <button
                      className={`chip-btn ${p.integration_status === 'pending' ? 'active' : ''}`}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '4px' }}
                      onClick={() => handleUpdatePlatformStatus(p.id, 'pending')}
                    >
                      Pending
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Restaurant & Branch Manager */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Store size={18} color="var(--accent-cyan)" />
                <span>Restaurant Branches Catalog</span>
              </h3>

              <button
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                onClick={() => setShowAddBranch(!showAddBranch)}
              >
                <Plus size={14} />
                <span>Add Branch Location</span>
              </button>
            </div>

            {showAddBranch && (
              <form onSubmit={handleCreateBranch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18, padding: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 8 }}>
                <select
                  value={newBranchRestId}
                  onChange={(e) => setNewBranchRestId(e.target.value)}
                  className="chip-btn"
                  style={{ flex: 1 }}
                >
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Branch Name (e.g. Empire - Whitefield)"
                  className="search-input"
                  style={{ flex: 2, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Area (e.g. Whitefield)"
                  className="search-input"
                  style={{ flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                  value={newBranchArea}
                  onChange={(e) => setNewBranchArea(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="City"
                  className="search-input"
                  style={{ width: 120, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 6 }}
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 18px' }}>
                  Save
                </button>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {branches.map(b => (
                <div key={b.id} style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{b.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{b.restaurant_name} • {b.area}, {b.city}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PIN: {b.pincode} • Delivery: {b.delivery_radius_km || 7} km radius</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  User as UserIcon, 
  Moon, 
  Sun, 
  Settings, 
  Menu, 
  X, 
  ArrowRight,
  Compass,
  HelpCircle,
  Bell,
  Heart,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { api, getApiBaseUrl } from '../services/api';

interface NavbarProps {
  onOpenLocation: () => void;
  onOpenAuth: () => void;
  onToggleDashboard: (tab?: 'favorites' | 'alerts' | 'history') => void;
  onToggleAdmin: () => void;
  onStartComparing: () => void;
  viewMode: 'home' | 'search_results' | 'dashboard' | 'admin';
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLocation,
  onOpenAuth,
  onToggleDashboard,
  onToggleAdmin,
  onStartComparing,
  viewMode,
  theme,
  onToggleTheme
}) => {
  const { location } = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swiggyConnected, setSwiggyConnected] = useState(false);
  const [swiggyStatusLabel, setSwiggyStatusLabel] = useState('Swiggy Auth Required');

  useEffect(() => {
    let isMounted = true;
    api.getSwiggyStatus().then(status => {
      if (isMounted) {
        if (status?.connected) {
          setSwiggyConnected(true);
          setSwiggyStatusLabel('Swiggy Connected');
        } else if (status?.status === 'UNAVAILABLE') {
          setSwiggyConnected(false);
          setSwiggyStatusLabel('Swiggy Unavailable');
        } else {
          setSwiggyConnected(false);
          setSwiggyStatusLabel('Swiggy Auth Required');
        }
      }
    }).catch(() => {
      if (isMounted) {
        setSwiggyConnected(false);
        setSwiggyStatusLabel('Swiggy Unavailable');
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleConnectSwiggy = () => {
    window.location.href = `${getApiBaseUrl()}/integrations/swiggy/connect`;
  };

  const scrollToHowItWorks = () => {
    setMobileMenuOpen(false);
    if (viewMode !== 'home') {
      onStartComparing();
      setTimeout(() => {
        const elem = document.getElementById('how-it-works');
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const elem = document.getElementById('how-it-works');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleNavClick = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  return (
    <header className="navbar" role="banner">
      <div className="navbar-container">
        
        {/* ===================================================
            GROUP 1: BRAND / LOGO
           =================================================== */}
        <div className="brand-group">
          <div 
            className="brand-wordmark" 
            onClick={onStartComparing} 
            role="button" 
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onStartComparing(); }}
            title="FoodCompare — Return to Home"
            aria-label="FoodCompare Home"
          >
            <div className="brand-crest">
              <span className="brand-crest-text">FC</span>
            </div>
            <div className="brand-title">
              Food<span>Compare</span>
            </div>
          </div>
        </div>

        {/* ===================================================
            GROUP 2: PRIMARY NAVIGATION (DESKTOP)
           =================================================== */}
        <nav className="primary-nav" aria-label="Primary Navigation">
          <button
            type="button"
            className={`nav-link-btn ${viewMode === 'home' ? 'active' : ''}`}
            onClick={onStartComparing}
          >
            Compare
          </button>
          <button
            type="button"
            className="nav-link-btn"
            onClick={scrollToHowItWorks}
          >
            How It Works
          </button>
          <button
            type="button"
            className="nav-link-btn"
            onClick={() => onToggleDashboard('alerts')}
          >
            Price Alerts
          </button>
          <button
            type="button"
            className="nav-link-btn"
            onClick={() => onToggleDashboard('favorites')}
          >
            Favorites
          </button>
        </nav>

        {/* ===================================================
            GROUPS 3, 4, 5: UTILITIES & ACTIONS (DESKTOP)
           =================================================== */}
        <div className="header-utilities-wrapper">
          
          {/* GROUP 3: Location / Settings */}
          <div className="utility-cluster location-settings-cluster">
            <button 
              type="button"
              className="location-pill-btn" 
              onClick={onOpenLocation} 
              title={`Delivery location: ${location.area || location.city}. Click to change.`}
              aria-label="Change delivery location"
            >
              <MapPin size={14} className="location-icon" />
              <span className="location-name">{location.area || location.city}</span>
              <ChevronDown size={13} className="location-caret" />
            </button>

            <button
              type="button"
              className="theme-circle-toggle"
              onClick={onToggleTheme}
              title={theme === 'dark' ? "Switch to light theme" : "Switch to dark theme"}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>

          <div className="header-divider-line" />

          {/* GROUP 4: Provider / Admin */}
          <div className="utility-cluster provider-admin-cluster">
            <button
              type="button"
              className={`provider-status-pill ${swiggyConnected ? 'connected' : 'ready'}`}
              onClick={handleConnectSwiggy}
              title={swiggyConnected ? "Swiggy /food MCP Live & Authorized" : "Authorize Swiggy account via Builders Club MCP (OAuth 2.1)"}
              aria-label="Swiggy Integration Status"
            >
              <span className={`provider-indicator-dot ${swiggyConnected ? 'active-emerald' : 'ready-orange'}`} />
              <span className="provider-label">
                {swiggyStatusLabel}
              </span>
            </button>

            <button
              type="button"
              className={`admin-nav-btn ${viewMode === 'admin' ? 'active' : ''}`}
              onClick={onToggleAdmin}
              title="Admin Health & Monitoring Console"
              aria-label="Admin Dashboard"
            >
              <Settings size={14} />
              <span>Admin</span>
            </button>
          </div>

          <div className="header-divider-line" />

          {/* GROUP 5: Account & Primary CTA */}
          <div className="utility-cluster account-action-cluster">
            {user ? (
              <div className="user-auth-pill">
                <button
                  type="button"
                  className={`user-profile-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                  onClick={() => onToggleDashboard()}
                  title={`Account: ${user.name || user.email}`}
                  aria-label="User Account Dashboard"
                >
                  <UserIcon size={14} />
                  <span className="user-firstname">
                    {user.name ? user.name.split(' ')[0] : 'Account'}
                  </span>
                </button>
                <button
                  type="button"
                  className="user-logout-btn"
                  onClick={logout}
                  title="Sign Out of Account"
                  aria-label="Sign Out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="signin-nav-btn" 
                onClick={onOpenAuth}
                aria-label="Sign In or Register"
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              className="primary-compare-cta"
              onClick={onStartComparing}
              aria-label="Start comparing food prices"
            >
              <span>Start Comparing</span>
              <ArrowRight size={15} className="cta-arrow-icon" />
            </button>
          </div>
        </div>

        {/* ===================================================
            MOBILE HEADER CONTROLS (TABLET & MOBILE)
           =================================================== */}
        <div className="mobile-header-bar">
          <button
            type="button"
            className="mobile-loc-pill"
            onClick={onOpenLocation}
            title="Change Delivery Location"
            aria-label="Delivery Location"
          >
            <MapPin size={13} color="var(--accent-gold)" />
            <span>{location.area || location.city}</span>
          </button>

          <button
            type="button"
            className="mobile-cta-button"
            onClick={onStartComparing}
            aria-label="Start Comparing"
          >
            Compare
          </button>

          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

      </div>

      {/* ===================================================
          MOBILE SLIDE-DOWN DRAWER MENU
         =================================================== */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-inner">
              
              {/* Drawer Top Navigation Links */}
              <div className="mobile-nav-section">
                <div className="mobile-section-label">Navigation</div>
                <button
                  type="button"
                  className={`mobile-nav-link ${viewMode === 'home' ? 'active' : ''}`}
                  onClick={() => handleNavClick(onStartComparing)}
                >
                  <Compass size={17} color="var(--accent-gold)" />
                  <span>Compare Dishes</span>
                </button>
                <button
                  type="button"
                  className="mobile-nav-link"
                  onClick={scrollToHowItWorks}
                >
                  <HelpCircle size={17} color="var(--accent-gold)" />
                  <span>How It Works</span>
                </button>
                <button
                  type="button"
                  className="mobile-nav-link"
                  onClick={() => handleNavClick(() => onToggleDashboard('alerts'))}
                >
                  <Bell size={17} color="var(--accent-gold)" />
                  <span>Price Drop Alerts</span>
                </button>
                <button
                  type="button"
                  className="mobile-nav-link"
                  onClick={() => handleNavClick(() => onToggleDashboard('favorites'))}
                >
                  <Heart size={17} color="var(--accent-gold)" />
                  <span>Favorite Dishes</span>
                </button>
              </div>

              <div className="mobile-drawer-divider" />

              {/* Drawer Utilities */}
              <div className="mobile-nav-section">
                <div className="mobile-section-label">Preferences & Providers</div>
                
                <button
                  type="button"
                  className="mobile-utility-row"
                  onClick={() => handleNavClick(onOpenLocation)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={17} color="var(--accent-gold)" />
                    <span>Location: <strong>{location.area || location.city}</strong></span>
                  </div>
                  <span className="mobile-pill-tag">Change</span>
                </button>

                <button
                  type="button"
                  className="mobile-utility-row"
                  onClick={handleConnectSwiggy}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span 
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: swiggyConnected ? 'var(--accent-emerald)' : '#fc8019',
                        display: 'inline-block'
                      }} 
                    />
                    <span>{swiggyStatusLabel}</span>
                  </div>
                  <span className="mobile-pill-tag">{swiggyConnected ? 'Synced' : 'OAuth 2.1'}</span>
                </button>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    className="mobile-utility-btn"
                    onClick={onToggleTheme}
                    style={{ flex: 1 }}
                  >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
                  </button>

                  <button
                    type="button"
                    className={`mobile-utility-btn ${viewMode === 'admin' ? 'active' : ''}`}
                    onClick={() => handleNavClick(onToggleAdmin)}
                    style={{ flex: 1 }}
                  >
                    <Settings size={15} />
                    <span>Admin</span>
                  </button>
                </div>
              </div>

              <div className="mobile-drawer-divider" />

              {/* Drawer Account & Action */}
              <div className="mobile-nav-section">
                <div className="mobile-section-label">Account</div>
                {user ? (
                  <div className="mobile-user-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <UserIcon size={18} color="var(--accent-gold)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.name || user.email}</div>
                        {user.name && user.email && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => handleNavClick(logout)}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: '100%', padding: '12px', fontSize: '0.92rem', marginBottom: 12 }}
                    onClick={() => handleNavClick(onOpenAuth)}
                  >
                    Sign In / Register
                  </button>
                )}

                <button
                  type="button"
                  className="primary-compare-cta"
                  style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: '0.95rem' }}
                  onClick={() => handleNavClick(onStartComparing)}
                >
                  <span>Start Comparing Prices</span>
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </header>
  );
};

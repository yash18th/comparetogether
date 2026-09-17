import React, { useState } from 'react';
import { MapPin, ShieldCheck, User as UserIcon, Moon, Sun, Settings, Menu, X, ArrowRight } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useMembership } from '../context/MembershipContext';

interface NavbarProps {
  onOpenLocation: () => void;
  onOpenAuth: () => void;
  onToggleDashboard: (tab?: 'favorites' | 'alerts') => void;
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
  const { hasMembership, toggleMembership } = useMembership();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToHowItWorks = () => {
    setMobileMenuOpen(false);
    const elem = document.getElementById('how-it-works');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand Wordmark */}
        <div className="brand-wordmark" onClick={() => onToggleDashboard()}>
          <div className="brand-crest">
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>FC</span>
          </div>
          <div className="brand-title">
            Food<span>Compare</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="nav-links">
          <button
            type="button"
            className={`nav-link-item ${viewMode === 'home' ? 'active' : ''}`}
            onClick={onStartComparing}
          >
            Compare
          </button>
          <button
            type="button"
            className="nav-link-item"
            onClick={scrollToHowItWorks}
          >
            How It Works
          </button>
          <button
            type="button"
            className="nav-link-item"
            onClick={() => onToggleDashboard('alerts')}
          >
            Price Alerts
          </button>
          <button
            type="button"
            className="nav-link-item"
            onClick={() => onToggleDashboard('favorites')}
          >
            Favorites
          </button>
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Location Selector Pill */}
          <button className="location-pill" onClick={onOpenLocation} title="Change delivery location">
            <MapPin size={15} color="var(--accent-gold)" />
            <span style={{ fontWeight: 600 }}>{location.area || location.city}</span>
          </button>

          {/* VIP Membership Toggle */}
          <button
            className={`membership-toggle ${hasMembership ? 'active' : ''}`}
            onClick={toggleMembership}
            title="Toggle Swiggy One / Zomato Gold Member Pricing"
            style={{ display: 'none' }} // Hidden on small screens or keep clean
          >
            <ShieldCheck size={15} />
            <span>{hasMembership ? 'VIP Active' : 'Public'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="btn-secondary"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={onToggleTheme}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Admin Switcher */}
          <button
            className={`btn-secondary ${viewMode === 'admin' ? 'active' : ''}`}
            onClick={onToggleAdmin}
            title="Admin Management Console"
            style={viewMode === 'admin' ? { borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' } : {}}
          >
            <Settings size={15} />
            <span style={{ display: 'inline', fontSize: '0.82rem' }}>Admin</span>
          </button>

          {/* Auth Button */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className={`btn-secondary ${viewMode === 'dashboard' ? 'active' : ''}`}
                onClick={() => onToggleDashboard()}
                style={{ fontSize: '0.85rem' }}
              >
                <UserIcon size={15} />
                <span>{user.name.split(' ')[0]}</span>
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn-secondary" style={{ fontSize: '0.85rem' }} onClick={onOpenAuth}>
              Sign In
            </button>
          )}

          {/* Subtle Primary "Start Comparing" Button */}
          <button
            className="btn-gold"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            onClick={onStartComparing}
          >
            <span>Start Comparing</span>
            <ArrowRight size={14} />
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            className="btn-secondary"
            style={{ width: 36, height: 36, padding: 0, display: 'none' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};

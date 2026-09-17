import React, { useState } from 'react';
import { MapPin, Navigation, X, Check } from 'lucide-react';
import { useLocation } from '../context/LocationContext';

interface LocationModalProps {
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ onClose }) => {
  const { location, setLocation, supportedLocations, detectCurrentLocation, isDetecting } = useLocation();
  const [selectedCity, setSelectedCity] = useState(location.city);
  const [customArea, setCustomArea] = useState('');
  const [customPincode, setCustomPincode] = useState('');

  const currentCityData = supportedLocations.find(l => l.city.toLowerCase() === selectedCity.toLowerCase()) || supportedLocations[0];

  const handleSelectArea = (areaName: string, pincode: string) => {
    setLocation({
      city: selectedCity,
      area: areaName,
      pincode: pincode,
      formatted: `${areaName}, ${selectedCity} - ${pincode}`
    });
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customArea.trim()) return;
    setLocation({
      city: selectedCity,
      area: customArea.trim(),
      pincode: customPincode.trim() || '560001',
      formatted: `${customArea.trim()}, ${selectedCity}`
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={20} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Choose Delivery Location</h3>
          </div>
          <button className="btn-secondary" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Detect Location Button */}
          <button
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', borderColor: 'var(--accent-emerald)' }}
            onClick={async () => {
              await detectCurrentLocation();
              onClose();
            }}
            disabled={isDetecting}
          >
            <Navigation size={16} color="var(--accent-emerald)" />
            <span>{isDetecting ? 'Detecting GPS Coordinates...' : 'Use Current Device Location'}</span>
          </button>

          {/* City Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
              Select Metro City:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {supportedLocations.map(l => (
                <button
                  key={l.city}
                  className={`chip-btn ${selectedCity.toLowerCase() === l.city.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setSelectedCity(l.city)}
                >
                  {l.city}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Areas in Selected City */}
          {currentCityData && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                Popular Delivery Hubs in {selectedCity}:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {currentCityData.areas.map((a: any) => {
                  const isSelected = location.city.toLowerCase() === selectedCity.toLowerCase() && location.area.toLowerCase() === a.name.toLowerCase();
                  return (
                    <button
                      key={a.name}
                      className="glass-panel"
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: isSelected ? '1px solid var(--accent-emerald)' : undefined,
                        background: isSelected ? 'rgba(16, 185, 129, 0.1)' : undefined
                      }}
                      onClick={() => handleSelectArea(a.name, a.pincode)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PIN: {a.pincode}</div>
                      </div>
                      {isSelected && <Check size={16} color="var(--accent-emerald)" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <form onSubmit={handleCustomSubmit} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
              Or Enter Custom Area / Colony:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="search-input"
                placeholder="Area name (e.g. Richmond Town)"
                style={{
                  flex: 2,
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px'
                }}
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
              />
              <input
                type="text"
                className="search-input"
                placeholder="PIN"
                style={{
                  flex: 1,
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px'
                }}
                value={customPincode}
                onChange={(e) => setCustomPincode(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                Set
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

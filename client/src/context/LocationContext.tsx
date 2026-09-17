import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface LocationState {
  city: string;
  area: string;
  pincode: string;
  formatted: string;
}

interface LocationContextType {
  location: LocationState;
  setLocation: (loc: LocationState) => void;
  supportedLocations: any[];
  detectCurrentLocation: () => Promise<void>;
  isDetecting: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const DEFAULT_LOCATION: LocationState = {
  city: 'Bangalore',
  area: 'Indiranagar',
  pincode: '560038',
  formatted: 'Indiranagar, Bangalore'
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocationState] = useState<LocationState>(() => {
    const saved = localStorage.getItem('fc_loc');
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  });
  const [supportedLocations, setSupportedLocations] = useState<any[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    api.getLocations().then(setSupportedLocations).catch(console.error);
  }, []);

  const setLocation = (loc: LocationState) => {
    setLocationState(loc);
    localStorage.setItem('fc_loc', JSON.stringify(loc));
  };

  const detectCurrentLocation = async () => {
    setIsDetecting(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const detected = await api.detectLocation(pos.coords.latitude, pos.coords.longitude);
            if (detected) {
              setLocation({
                city: detected.city,
                area: detected.area,
                pincode: detected.pincode,
                formatted: detected.formatted || `${detected.area}, ${detected.city}`
              });
            }
            setIsDetecting(false);
          },
          async () => {
            // Fallback to default
            const detected = await api.detectLocation();
            if (detected) {
              setLocation({
                city: detected.city,
                area: detected.area,
                pincode: detected.pincode,
                formatted: detected.formatted || `${detected.area}, ${detected.city}`
              });
            }
            setIsDetecting(false);
          }
        );
      } else {
        const detected = await api.detectLocation();
        setLocation(detected);
        setIsDetecting(false);
      }
    } catch {
      setIsDetecting(false);
    }
  };

  return (
    <LocationContext.Provider
      value={{ location, setLocation, supportedLocations, detectCurrentLocation, isDetecting }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
};

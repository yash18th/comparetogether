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

export const FALLBACK_SUPPORTED_LOCATIONS = [
  {
    city: 'Bangalore',
    areas: [
      { name: 'Indiranagar', pincode: '560038', popular: true },
      { name: 'Koramangala', pincode: '560095', popular: true },
      { name: 'HSR Layout', pincode: '560102', popular: true },
      { name: 'Whitefield', pincode: '560066', popular: true },
      { name: 'JP Nagar', pincode: '560078', popular: false },
      { name: 'Jayanagar', pincode: '560011', popular: false }
    ]
  },
  {
    city: 'Mumbai',
    areas: [
      { name: 'Bandra West', pincode: '400050', popular: true },
      { name: 'Andheri West', pincode: '400053', popular: true },
      { name: 'Powai', pincode: '400076', popular: false }
    ]
  },
  {
    city: 'Delhi NCR',
    areas: [
      { name: 'Connaught Place', pincode: '110001', popular: true },
      { name: 'Cyber City Gurgaon', pincode: '122002', popular: true }
    ]
  }
];

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocationState] = useState<LocationState>(() => {
    const saved = localStorage.getItem('fc_loc');
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  });
  const [supportedLocations, setSupportedLocations] = useState<any[]>(FALLBACK_SUPPORTED_LOCATIONS);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    api.getLocations().then(locs => {
      if (Array.isArray(locs) && locs.length > 0) {
        setSupportedLocations(locs);
      }
    }).catch(console.error);
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

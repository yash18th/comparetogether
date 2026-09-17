import React, { createContext, useContext, useState } from 'react';

interface MembershipContextType {
  hasMembership: boolean;
  toggleMembership: () => void;
  setHasMembership: (val: boolean) => void;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export const MembershipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasMembership, setHasMembershipState] = useState<boolean>(() => {
    return localStorage.getItem('fc_membership') === 'true';
  });

  const toggleMembership = () => {
    setHasMembershipState(prev => {
      const next = !prev;
      localStorage.setItem('fc_membership', String(next));
      return next;
    });
  };

  const setHasMembership = (val: boolean) => {
    setHasMembershipState(val);
    localStorage.setItem('fc_membership', String(val));
  };

  return (
    <MembershipContext.Provider value={{ hasMembership, toggleMembership, setHasMembership }}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => {
  const context = useContext(MembershipContext);
  if (!context) throw new Error('useMembership must be used within MembershipProvider');
  return context;
};

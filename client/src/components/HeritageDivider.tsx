import React from 'react';

export const HeritageDivider: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  return (
    <div className="heritage-divider" style={style}>
      <span className="heritage-divider-symbol">❖</span>
    </div>
  );
};

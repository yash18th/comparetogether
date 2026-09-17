import React, { useState } from 'react';
import { Clock } from 'lucide-react';

interface HistoryPoint {
  recorded_at: string;
  price: number;
  platform_name: string;
  platform_code: string;
}

interface PriceHistoryChartProps {
  history: HistoryPoint[];
  averagePrice30d: number;
  lastUpdated?: string;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  history,
  averagePrice30d,
  lastUpdated = '8 minutes ago'
}) => {
  const [activePlatform, setActivePlatform] = useState<string>('all');

  // Filter history by platform if selected
  const filteredHistory = activePlatform === 'all'
    ? history
    : history.filter(h => h.platform_code === activePlatform);

  const platforms = Array.from(new Set(history.map(h => h.platform_code)));

  if (history.length === 0) {
    return (
      <div className="history-chart-card">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Historical price records are gathering for this item. Check back shortly.
        </p>
      </div>
    );
  }

  // Calculate SVG coordinates
  const prices = filteredHistory.map(h => h.price);
  const minPrice = Math.min(...prices, averagePrice30d) * 0.9;
  const maxPrice = Math.max(...prices, averagePrice30d) * 1.1;

  const width = 580;
  const height = 180;
  const padding = 35;

  const getX = (index: number) => {
    if (filteredHistory.length <= 1) return width / 2;
    return padding + (index / (filteredHistory.length - 1)) * (width - padding * 2);
  };

  const getY = (price: number) => {
    return height - padding - ((price - minPrice) / (maxPrice - minPrice)) * (height - padding * 2);
  };

  const pointsString = filteredHistory.map((h, i) => `${getX(i)},${getY(h.price)}`).join(' ');
  const avgY = getY(averagePrice30d);

  return (
    <div className="history-chart-card">
      <div className="chart-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Price Trend & Recency</h4>
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 600
            }}>
              30-Day Average: ₹{averagePrice30d}
            </span>
          </div>
          <div className="last-updated-badge" style={{ marginTop: 4 }}>
            <Clock size={13} />
            <span>Price updated {lastUpdated}</span>
          </div>
        </div>

        {/* Platform filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`chip-btn ${activePlatform === 'all' ? 'active' : ''}`}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            onClick={() => setActivePlatform('all')}
          >
            All
          </button>
          {platforms.map(p => (
            <button
              key={p}
              className={`chip-btn ${activePlatform === p ? 'active' : ''}`}
              style={{ fontSize: '0.75rem', padding: '4px 8px', textTransform: 'capitalize' }}
              onClick={() => setActivePlatform(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Line Graph */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Average Reference Line */}
          <line
            x1={padding}
            y1={avgY}
            x2={width - padding}
            y2={avgY}
            stroke="var(--accent-amber)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text
            x={width - padding - 4}
            y={avgY - 6}
            fill="var(--accent-amber)"
            fontSize="10"
            textAnchor="end"
            fontWeight="600"
          >
            30d avg (₹{averagePrice30d})
          </text>

          {/* Price Line */}
          <polyline
            fill="none"
            stroke="var(--accent-emerald)"
            strokeWidth="3"
            points={pointsString}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {filteredHistory.map((h, i) => {
            const cx = getX(i);
            const cy = getY(h.price);
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill="#ffffff"
                  stroke="var(--accent-emerald)"
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={cy - 10}
                  fill="var(--text-primary)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  ₹{h.price}
                </text>
                <text
                  x={cx}
                  y={height - 10}
                  fill="var(--text-muted)"
                  fontSize="9.5"
                  textAnchor="middle"
                >
                  {i === filteredHistory.length - 1 ? 'Today' : i === filteredHistory.length - 2 ? 'Yesterday' : `${(filteredHistory.length - 1 - i) * 7}d ago`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

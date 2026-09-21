import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0d1117',
          color: '#fbf9f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'rgba(20, 25, 35, 0.85)',
            border: '1px solid rgba(197, 160, 89, 0.3)',
            borderRadius: '16px',
            padding: '40px 32px',
            maxWidth: '520px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#c5a059' }}>
              FoodCompare
            </h2>
            <p style={{ color: '#cbb092', marginBottom: '24px', fontSize: '0.95rem' }}>
              We encountered a display issue loading this section.
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  // ignore
                }
                window.location.reload();
              }}
              style={{
                background: 'linear-gradient(135deg, #c5a059 0%, #ecd089 50%, #a8843a 100%)',
                color: '#12161f',
                border: 'none',
                borderRadius: '9999px',
                padding: '10px 24px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

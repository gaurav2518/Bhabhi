import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Bhabhi ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('bhabhi_room_code');
    localStorage.removeItem('bhabhi_player_token');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="landing-viewport">
          <div className="landing-portal-card" style={{ textAlign: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <h2 style={{ color: '#ef4444', fontWeight: 900 }}>Something went wrong</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button className="btn-gold-action" onClick={this.handleReset}>
              <span>Reload Game</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

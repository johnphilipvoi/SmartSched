import {Component, type ErrorInfo, type ReactNode} from 'react';
import {AlertTriangle, RefreshCw} from 'lucide-react';

type State = {error: Error | null};

/** Keeps a rendering failure from leaving the user with a blank screen. */
export default class ErrorBoundary extends Component<{children: ReactNode}, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SmartSched could not render this view.', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal-error">
        <div className="fatal-error-card">
          <span className="fatal-error-icon"><AlertTriangle size={26} /></span>
          <h1>Something went wrong</h1>
          <p>Your saved schedule is still on this device. Reload the app to pick up where you left off.</p>
          <button className="primary" onClick={() => window.location.reload()}>
            <RefreshCw size={17} /> Reload SmartSched
          </button>
        </div>
      </div>
    );
  }
}

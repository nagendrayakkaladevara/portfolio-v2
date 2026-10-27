import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <main className="writing-page"><h1>Something went wrong.</h1><p className="writing-intro">Please reload the portfolio to try again.</p><a className="more-link" href="/">Reload portfolio →</a></main> : this.props.children;
  }
}

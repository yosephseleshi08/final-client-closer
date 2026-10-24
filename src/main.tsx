import React, { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RootErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.removeItem('outreach_engine_real_leads_v3');
      localStorage.removeItem('outreach_engine_followup_logs_v3');
      localStorage.removeItem('outreach_engine_discipline_v1');
    } catch (_e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080c14] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl text-center space-y-5 backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-3xl">
              ⚡
            </div>
            <div>
              <h2 className="text-2xl font-black text-white font-['Outfit']">Outreach Engine Pro</h2>
              <p className="text-xs text-slate-400 mt-1">Application encountered an unexpected error</p>
            </div>
            {this.state.error && (
              <div className="text-left text-xs font-mono bg-black/40 border border-white/5 rounded-xl p-3 text-rose-300 max-h-32 overflow-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Reload Pipeline
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Reset Local Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);


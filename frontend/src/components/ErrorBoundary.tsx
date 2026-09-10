import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
          <div className="bg-surface border border-border rounded-2xl p-8 max-w-md text-center">
            <AlertTriangle size={40} className="mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold text-text mb-2">Something went wrong</h2>
            <p className="text-sm text-text-muted mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-sm"
            >
              <RefreshCw size={14} /> Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
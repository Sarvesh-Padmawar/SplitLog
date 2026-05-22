import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Premium React Error Boundary Component
 * Isolates widget crashes to ensure a single component crash does not break the entire dashboard.
 * Designed to perfectly match the sleek Glassmorphism and dark mode visual aesthetics.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an active runtime error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      // Reload standard state or path
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallbacks
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-red-500/20 shadow-glow-red min-h-[220px] h-full w-full animate-fadeIn">
          <div className="p-3 rounded-full bg-red-500/10 text-red-400 mb-3 border border-red-500/20 animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
          
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
            {this.props.title || "Widget Offline"}
          </h3>
          
          <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed truncate-2-lines">
            {this.state.error?.message || "An unexpected rendering error occurred inside this section."}
          </p>
          
          <button
            onClick={this.handleReset}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-gray-300 hover:bg-white/[0.08] hover:text-white transition-all duration-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Widget
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

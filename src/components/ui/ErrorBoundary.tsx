"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        this.props.fallback ?? (
          <div className="app-card flex items-center gap-3 text-sm text-slate-500">
            <span className="text-base">⚠</span>
            <span>Unable to load this section.</span>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

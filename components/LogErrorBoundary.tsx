'use client';

import { Component, ReactNode } from 'react';

interface Props  { children: ReactNode; fallback?: ReactNode }
interface State  { hasError: boolean; error?: Error }

/**
 * Isole chaque log : si un crashe (data corrompue, avatar, markdown...),
 * les autres restent affichés. Plus de disparition massive.
 */
export default class LogErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[LogErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="px-3 py-2 rounded-xl text-xs bg-red-500/5 border border-red-500/15 text-red-400">
          ⚠️ Erreur d'affichage de ce log
        </div>
      );
    }
    return this.props.children;
  }
}

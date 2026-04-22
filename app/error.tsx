'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-white mb-2">Une erreur est survenue</h1>
        <p className="text-slate-400 text-sm mb-6">
          {error.message ?? 'Erreur inattendue. Réessayez ou revenez au dashboard.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-lg bg-[#1a2235] border border-[#1e2d4a] text-slate-300 text-sm font-medium hover:text-white transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

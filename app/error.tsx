'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Impossible de charger les projets
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Une erreur est survenue lors de la récupération des données.
        </p>
        <button
          onClick={reset}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

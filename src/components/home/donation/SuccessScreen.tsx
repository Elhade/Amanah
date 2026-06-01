'use client';

import { CheckCircle } from 'lucide-react';
import type { Leader } from '@/types';
import type { ProjectWithStats } from '@/types/project';

interface Props {
  amount: number;
  project: ProjectWithStats;
  leader?: Leader | null;
  isCard: boolean;
}

export function SuccessScreen({ amount, project, leader, isCard }: Props) {
  return (
    <div className="p-6 text-center">
      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">JazakAllah Khayr !</h3>
      <p className="text-gray-500 mb-1 text-sm">
        {isCard ? 'Votre paiement a été confirmé.' : 'Votre don a été enregistré.'}
      </p>
      {leader && (
        <p className="text-sm text-emerald-600 font-medium">Collecté par {leader.nom_affichage}</p>
      )}
      <div className="mt-4 bg-emerald-50 rounded-2xl p-4">
        <p className="text-emerald-800 font-semibold text-lg">{amount.toLocaleString('fr-FR')} €</p>
        <p className="text-emerald-600 text-sm">{project.nom}</p>
      </div>
      <p className="text-xs text-gray-400 mt-4">
        Puisse Allah accepter votre sadaqa et vous récompenser au centuple.
      </p>
    </div>
  );
}

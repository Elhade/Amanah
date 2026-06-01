'use client';

import { CheckCircle } from 'lucide-react';
import type { Leader } from '@/types';
import type { ProjectWithStats } from '@/types/project';

interface Props {
  amount: number;
  project: ProjectWithStats;
  leader?: Leader | null;
  pseudo: string;
  isExistingAccount: boolean;
}

export function VirementConfirmScreen({
  amount, project, leader,
  pseudo, isExistingAccount,
}: Props) {
  return (
    <div className="p-6">
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-7 h-7 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Prélèvement  enregistré ✓</h3>
        <p className="text-gray-500 text-sm mt-1">
          {isExistingAccount
            ? 'Votre nouveau don  a bien été pris en compte.'
            : 'Votre compte et votre prélèvement ont bien été créés.'}
        </p>
      </div>

      <div className="bg-emerald-50 rounded-2xl p-4 space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Pseudo</span>
          <span className="font-mono font-bold text-emerald-700">{pseudo}</span>
        </div>
        <div className="h-px bg-emerald-100" />
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Montant</span>
          <span className="font-bold text-emerald-700">{amount.toLocaleString('fr-FR')} €</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Projet</span>
          <span className="font-semibold text-gray-800 text-right max-w-[55%]">{project.nom}</span>
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-700 leading-relaxed">
          Votre prélèvement SEPA a été initié. Le mandat a été signé électroniquement et le montant sera débité sous <strong>1 à 3 jours ouvrables</strong>.
        </p>
      </div>

      {leader && (
        <p className="text-center text-sm text-emerald-600 font-medium mt-4">
          Collecté par {leader.nom_affichage}
        </p>
      )}
      <p className="text-center text-xs text-gray-400 mt-4">
        Puisse Allah accepter votre sadaqa et vous récompenser au centuple.
      </p>
    </div>
  );
}

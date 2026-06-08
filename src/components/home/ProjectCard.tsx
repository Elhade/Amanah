'use client';

import { useState } from 'react';
import { Lock, ShieldCheck, HandHeart, ChevronUp } from 'lucide-react';
import type { ProjectWithStats } from '@/types/project';
import type { Leader } from '@/types';
import { DonationForm } from './DonationForm';

interface Props {
  project: ProjectWithStats;
  leader?: Leader | null;
}

export function ProjectCard({ project, leader }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const percentage = Math.min(project.pourcentage, 100);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount);

  return (
    <div className="rounded-[32px] bg-white shadow-2xl border border-gray-100 overflow-hidden">
      {/* Image */}
      <div className="p-5 pb-0">
        <div className="relative h-72 overflow-hidden rounded-[24px]">
          {project.image_url ? (
            <img
              src={project.image_url}
              alt={project.nom}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-emerald-100 flex items-center justify-center">
              <HandHeart className="w-16 h-16 text-emerald-300" />
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="relative px-5 pt-12 pb-6">
        {/* Badge */}
        <div className="absolute -top-10 left-5">
          <div className="w-20 h-20 rounded-full bg-[#007A45] border-4 border-white shadow-lg flex items-center justify-center">
            <span className="text-3xl">🕌</span>
          </div>
        </div>

        {/* Titre */}
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900">
            {project.nom}
          </h2>
          <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Description */}
        <p className="mt-2 text-gray-500">
          {project.description}
        </p>

        {/* Montant */}
        <div className="mt-8 text-center">
          <div className="text-6xl font-black text-slate-900 leading-none">
            {formatAmount(project.collecte)} €
          </div>
          <div className="mt-2 text-xl text-gray-500">
            collectés sur{' '}
            <span className="font-bold text-slate-800">
              {formatAmount(project.objectif)} €
            </span>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-8">
          <div className="h-4 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-600"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">
              {Math.round(percentage)}%
            </span>
            <span className="text-gray-500">atteint</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-6 flex w-full h-16 items-center justify-center gap-2 rounded-2xl bg-[#006E3D] text-white font-bold text-xl hover:bg-[#005A32] transition-all"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-5 h-5" />
              Réduire
            </>
          ) : (
            'JE PARTICIPE →'
          )}
        </button>
      </div>

      {/* Accordéon — formulaire de don */}
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          {/* Séparateur visuel */}
          <div className="relative flex items-center px-6 py-1">
            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
            <div className="mx-3 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <HandHeart className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1 border-t-2 border-dashed border-gray-200" />
          </div>

          <DonationForm project={project} leader={leader} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-4">
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
          <Lock className="w-4 h-4" />
          <span>Plateforme 100% sécurisée</span>
        </div>
      </div>
    </div>
  );
}

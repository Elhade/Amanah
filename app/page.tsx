import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { getProjectsWithStats } from '@/services/projects.service';
import { getLeaderBySlug } from '@/services/leaders.service';
import { ProjectGrid } from '@/components/home/ProjectGrid';

export const metadata: Metadata = {
  title: 'JamaaAmanah — Donnez du sens à votre générosité',
  description:
    'Participez à des projets humanitaires et faites une différence dans la vie des nécessiteux.',
};

interface Props {
  searchParams: Promise<{ ref?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { ref } = await searchParams;

  const [projects, leader] = await Promise.all([
    getProjectsWithStats(),
    ref ? getLeaderBySlug(ref) : Promise.resolve(null),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 relative">
      {/* Décors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-white text-lg">JamaaAmanah</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-emerald-300 hover:text-white transition-colors"
          >
            Connexion
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-8">
          {leader ? (
            <>
              <p className="text-emerald-300 text-sm mb-1">Collecte organisée par</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
                {leader.nom_affichage}
              </h1>
            </>
          ) : (
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              Projets solidaires
            </h1>
          )}
          <p className="text-emerald-300 text-sm sm:text-base max-w-sm mx-auto">
            Chaque don compte. Participez à nos projets humanitaires et aidez ceux qui en ont besoin.
          </p>
        </div>

        <ProjectGrid projects={projects} leader={leader} />

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between text-xs text-emerald-400/50">
          <span>© {new Date().getFullYear()} JamaaAmanah</span>
          <Link href="/login" className="hover:text-emerald-300 transition-colors">
            Espace responsable
          </Link>
        </div>
      </div>
    </div>
  );
}

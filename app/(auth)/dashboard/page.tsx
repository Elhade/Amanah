'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Users, TrendingUp, HandHeart, ArrowRight, Clock, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import type { Donation, Project, Leader } from '@/types';

interface ProjectStats {
  project: Project;
  total: number;
}

interface LeaderStats {
  leader: Leader;
  total: number;
  count: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [totalCollected, setTotalCollected] = useState(0);
  const [donorCount, setDonorCount] = useState(0);
  const [donationCount, setDonationCount] = useState(0);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [leaderStats, setLeaderStats] = useState<LeaderStats[]>([]);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [donationsRes, projectsRes, leadersRes] = await Promise.all([
      supabase.from('donations').select('*, donors(nom), leaders(nom_affichage, slug), projects(nom)').order('created_at', { ascending: false }),
      supabase.from('projects').select('*'),
      supabase.from('leaders').select('*'),
    ]);

    const donations = (donationsRes.data || []) as unknown as Donation[];
    const projects = (projectsRes.data || []) as Project[];
    const leaders = (leadersRes.data || []) as Leader[];

    setTotalCollected(donations.reduce((sum, d) => sum + d.montant, 0));
    setDonationCount(donations.length);
    setDonorCount(new Set(donations.map(d => d.donor_id).filter(Boolean)).size);

    setProjectStats(projects.map(p => ({
      project: p,
      total: donations.filter(d => d.project_id === p.id).reduce((s, d) => s + d.montant, 0),
    })));

    setLeaderStats(leaders.map(l => {
      const lDons = donations.filter(d => d.leader_id === l.id);
      return { leader: l, total: lDons.reduce((s, d) => s + d.montant, 0), count: lDons.length };
    }).sort((a, b) => b.total - a.total));

    setRecentDonations(donations.slice(0, 8));
    setLoading(false);
  };

  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord global</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble de toutes les collectes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total collecté" value={fmt(totalCollected)} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Donateurs uniques" value={donorCount} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Nombre de dons" value={donationCount} icon={HandHeart} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <StatCard title="Responsables actifs" value={leaderStats.filter(l => l.count > 0).length} icon={TrendingUp} iconColor="text-teal-600" iconBg="bg-teal-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Progression par projet</h2>
          </div>
          <div className="space-y-5">
            {projectStats.map(({ project, total }) => (
              <div key={project.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{project.nom}</p>
                    <p className="text-xs text-gray-400">{fmt(total)} collectés</p>
                  </div>
                  {project.objectif > 0 && <p className="text-xs text-gray-400">objectif {fmt(project.objectif)}</p>}
                </div>
                <ProgressBar value={total} max={project.objectif || total || 1} />
              </div>
            ))}
            {projectStats.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucun projet disponible</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Classement des responsables</h2>
          </div>
          <div className="space-y-3">
            {leaderStats.map(({ leader, total, count }, i) => (
              <div key={leader.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-700/30 text-amber-800' : 'bg-gray-200 text-gray-600'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{leader.nom_affichage}</p>
                  <p className="text-xs text-gray-400">{count} don{count > 1 ? 's' : ''}</p>
                </div>
                <p className="font-bold text-gray-900 text-sm">{fmt(total)}</p>
              </div>
            ))}
            {leaderStats.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Aucun responsable disponible</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Activité récente</h2>
          </div>
          <button
            onClick={() => router.push('/historique')}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Tout voir <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentDonations.length === 0 ? (
          <div className="text-center py-8">
            <HandHeart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun don enregistré pour le moment</p>
            <button onClick={() => router.push('/ajouter-don')} className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
              Ajouter le premier don →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Donateur</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Projet</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Responsable</th>
                  <th className="pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentDonations.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-sm font-medium text-gray-800">{d.donors?.nom || 'Anonyme'}</td>
                    <td className="py-3 text-sm font-bold text-emerald-600">{fmt(d.montant)}</td>
                    <td className="py-3 text-sm text-gray-600 hidden sm:table-cell">{d.projects?.nom || '—'}</td>
                    <td className="py-3 text-sm text-gray-600 hidden md:table-cell">{d.leaders?.nom_affichage || '—'}</td>
                    <td className="py-3"><Badge status={d.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

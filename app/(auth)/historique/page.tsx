'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, Search, Filter, HandHeart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { MethodBadge } from '@/components/ui/MethodBadge';
import type { Donation, Project, Leader } from '@/lib/types';

export default function HistoriquePage() {
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [donationsRes, projectsRes, leadersRes] = await Promise.all([
      supabase.from('donations').select('*, donors(nom), leaders(nom_affichage, slug), projects(nom)').order('created_at', { ascending: false }),
      supabase.from('projects').select('*'),
      supabase.from('leaders').select('*'),
    ]);
    setDonations((donationsRes.data || []) as unknown as Donation[]);
    setProjects((projectsRes.data || []) as Project[]);
    setLeaders((leadersRes.data || []) as Leader[]);
    setLoading(false);
  };

  const filtered = donations.filter(d => {
    const matchSearch = !search || (d.donors?.nom || '').toLowerCase().includes(search.toLowerCase());
    const matchProject = !filterProject || d.project_id === filterProject;
    const matchLeader = !filterLeader || d.leader_id === filterLeader;
    const matchStatus = !filterStatus || d.statut === filterStatus;
    return matchSearch && matchProject && matchLeader && matchStatus;
  });

  const totalFiltered = filtered.reduce((s, d) => s + d.montant, 0);
  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des dons</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} don{filtered.length > 1 ? 's' : ''} · Total: {fmt(totalFiltered)}</p>
        </div>
        <button
          onClick={() => router.push('/ajouter-don')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
        >
          <HandHeart className="w-4 h-4" />
          Ajouter un don
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un donateur..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white">
              <option value="">Tous les projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
            <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white">
              <option value="">Tous les responsables</option>
              {leaders.map(l => <option key={l.id} value={l.id}>{l.nom_affichage}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white">
              <option value="">Tous les statuts</option>
              <option value="paid">Payé</option>
              <option value="cash_validated">Cash</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Aucun don trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-7 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
              <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Donateur</div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</div>
              <div className="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Projet</div>
              <div className="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Responsable</div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Méthode</div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</div>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(d => (
                <div key={d.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="hidden md:grid grid-cols-7 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-medium text-gray-800 text-sm">{d.donors?.nom || 'Anonyme'}</p>
                      <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="font-bold text-emerald-600">{fmt(d.montant)}</div>
                    <div className="text-sm text-gray-600 truncate">{d.projects?.nom || '—'}</div>
                    <div className="text-sm text-gray-600 truncate">{d.leaders?.nom_affichage || '—'}</div>
                    <div><MethodBadge method={d.methode} /></div>
                    <div><Badge status={d.statut} /></div>
                  </div>
                  <div className="md:hidden flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{d.donors?.nom || 'Anonyme'}</p>
                      <p className="text-xs text-gray-400">{d.projects?.nom || '—'} · {new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-emerald-600 text-sm">{fmt(d.montant)}</span>
                      <Badge status={d.statut} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { History, Search, Filter, ChevronLeft, ChevronRight, Banknote, RefreshCw, ArrowUpCircle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { MethodBadge } from '@/components/ui/MethodBadge';
import {
  triggerCashRemittance,
  getCashReceivedForLeader,
} from '@/actions/donation.actions';
import type { Donation, Project, Leader, DonationStatus } from '@/types';

const PAGE_SIZE = 8;

const STATUS_TABS: { label: string; value: DonationStatus | '' }[] = [
  { label: 'Tous',            value: ''              },
  { label: 'Payé',            value: 'paid'          },
  { label: 'Espèces reçues',  value: 'cash_received' },
  { label: 'Espèces versées', value: 'cash_remitted' },
  { label: 'En cours',        value: 'processing'    },
  { label: 'Échoué',          value: 'failed'        },
];

export default function HistoriquePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  const [donations, setDonations] = useState<Donation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filterProject, setFilterProject] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterStatus, setFilterStatus] = useState<DonationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [cashPending, setCashPending] = useState<{ id: string; montant: number }[]>([]);
  const [remittanceLoading, setRemittanceLoading] = useState(false);
  const [remittanceResult, setRemittanceResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [myLeaderId, setMyLeaderId] = useState<string | null>(null);

  useEffect(() => { if (profile) fetchData(); }, [profile]);
  useEffect(() => { setPage(1); }, [search, filterProject, filterLeader, filterStatus]);

  const fetchData = async () => {
    if (!profile) return;
    if (isSuperAdmin) {
      const [donationsRes, projectsRes, leadersRes] = await Promise.all([
        supabase.from('donations').select('*, donors(nom), leaders(nom_affichage, nom_equipe, slug), projects(nom)').order('created_at', { ascending: false }),
        supabase.from('projects').select('*'),
        supabase.from('leaders').select('*'),
      ]);
      setDonations((donationsRes.data || []) as unknown as Donation[]);
      setProjects((projectsRes.data || []) as Project[]);
      setLeaders((leadersRes.data || []) as Leader[]);
    } else {
      const leaderRes = await supabase.from('leaders').select('*').eq('user_id', profile.id).maybeSingle();
      const myLeader = leaderRes.data as Leader | null;
      if (!myLeader) { setLoading(false); return; }
      setMyLeaderId(myLeader.id);
      const [donationsRes, projectsRes, cashRes] = await Promise.all([
        supabase.from('donations').select('*, donors(nom), leaders(nom_affichage, nom_equipe, slug), projects(nom)').or(`leader_id.eq.${myLeader.id},leader_id.is.null`).order('created_at', { ascending: false }),
        supabase.from('projects').select('*'),
        getCashReceivedForLeader(myLeader.id),
      ]);
      setDonations((donationsRes.data || []) as unknown as Donation[]);
      setProjects((projectsRes.data || []) as Project[]);
      if (cashRes.ok) setCashPending(cashRes.data.map(d => ({ id: d.id, montant: d.montant })));
    }
    setLoading(false);
  };

  const handleVirementEspeces = async () => {
    if (!myLeaderId || !cashPending.length) return;
    setRemittanceLoading(true);
    setRemittanceResult(null);
    const ids = cashPending.map(d => d.id);
    const result = await triggerCashRemittance(myLeaderId, ids);
    if (result.ok) {
      setRemittanceResult({ ok: true, message: `Virement de ${fmt(cashPending.reduce((s, d) => s + d.montant, 0))} initié — les dons seront soldés à confirmation Stripe.` });
      setCashPending([]);
      await fetchData();
    } else {
      setRemittanceResult({ ok: false, message: result.error ?? 'Erreur inconnue' });
    }
    setRemittanceLoading(false);
  };


  const filtered = donations.filter(d => {
    const matchSearch = !search || (d.donors?.nom || '').toLowerCase().includes(search.toLowerCase());
    const matchProject = !filterProject || d.project_id === filterProject;
    const matchLeader = !filterLeader || (filterLeader === '__ghost__' ? !d.leader_id : d.leader_id === filterLeader);
    const matchStatus = !filterStatus || d.statut === filterStatus;
    return matchSearch && matchProject && matchLeader && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalFiltered = filtered.reduce((s, d) => s + d.montant, 0);
  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`;
  const leaderLabel = (d: Donation) => {
    const l = d.leaders as { nom_affichage: string; nom_equipe?: string | null } | null;
    return l?.nom_equipe || l?.nom_affichage || 'Ghost Team';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historique des dons</h1>
        <p className="text-gray-500 text-sm mt-1">{filtered.length} don{filtered.length > 1 ? 's' : ''} · Total : {fmt(totalFiltered)}</p>
      </div>

      {/* Bandeau virement espèces (leader uniquement) */}
      {!isSuperAdmin && cashPending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Banknote className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {cashPending.length} don{cashPending.length > 1 ? 's' : ''} en espèces à virer
              </p>
              <p className="text-amber-700 text-xs">
                Total : {fmt(cashPending.reduce((s, d) => s + d.montant, 0))} — 1 seul prélèvement SEPA
              </p>
            </div>
          </div>
          <button
            onClick={handleVirementEspeces}
            disabled={remittanceLoading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all"
          >
            {remittanceLoading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <ArrowUpCircle className="w-4 h-4" />}
            Virer les espèces
          </button>
        </div>
      )}

      {remittanceResult && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm ${remittanceResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {remittanceResult.ok
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />}
          <p>{remittanceResult.message}</p>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                filterStatus === tab.value
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white">
              <option value="">Tous les projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
            {isSuperAdmin && (
              <select value={filterLeader} onChange={e => setFilterLeader(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white">
                <option value="">Tous les responsables</option>
                <option value="__ghost__">Ghost Team</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.nom_equipe || l.nom_affichage}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Aucun don trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <>
            {/* En-têtes desktop — même layout que l'activité récente du dashboard */}
            <div className="hidden sm:grid grid-cols-[1.8fr_1.3fr_1.2fr_110px_110px_90px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Donateur</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projet</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Équipe</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Méthode</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</span>
            </div>

            <div className="divide-y divide-gray-50">
              {paginated.map(d => (
                <div key={d.id} className="flex sm:grid sm:grid-cols-[1.8fr_1.3fr_1.2fr_110px_110px_90px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors">
                  {/* Donateur + date */}
                  <div className="flex-1 sm:flex-none min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{(d.donors as { nom: string } | null)?.nom || 'Anonyme'}</p>
                    <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {/* Projet */}
                  <p className="hidden sm:block text-sm text-gray-600 truncate">{(d.projects as { nom: string } | null)?.nom || '—'}</p>
                  {/* Responsable */}
                  <p className="hidden sm:block text-sm text-gray-600 truncate">{leaderLabel(d)}</p>
                  {/* Méthode */}
                  <div className="hidden sm:block"><MethodBadge method={d.methode} /></div>
                  {/* Montant */}
                  <span className="text-sm font-bold text-emerald-600 whitespace-nowrap">{fmt(d.montant)}</span>
                  {/* Statut */}
                  <div className="hidden sm:block"><Badge status={d.statut} method={d.methode} /></div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  Page {page} sur {totalPages} · {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

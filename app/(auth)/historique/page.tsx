'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { History, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, Banknote, RefreshCw, ArrowUpCircle, CheckCircle2, XCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { MethodBadge } from '@/components/ui/MethodBadge';
import {
  triggerCashRemittance,
  getCashReceivedForLeader,
} from '@/actions/donation.actions';
import type { CashReceivedRow } from '@/actions/donation.actions';
import type { Donation, Project, Leader, Remittance, DonationStatus } from '@/types';

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
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [filterProject, setFilterProject] = useState('');
  const [filterLeader, setFilterLeader] = useState('');
  const [filterStatus, setFilterStatus] = useState<DonationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [cashPending, setCashPending] = useState<CashReceivedRow[]>([]);
  const [remittanceLoading, setRemittanceLoading] = useState(false);
  const [remittanceResult, setRemittanceResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [myLeaderId, setMyLeaderId] = useState<string | null>(null);
  const [leaderHasSepa, setLeaderHasSepa] = useState(false);
  const [leaderDonorId, setLeaderDonorId] = useState<string | null>(null);
  // Modal virement
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [personalAmount, setPersonalAmount] = useState('');
  const [personalProjectId, setPersonalProjectId] = useState('');
  const [expandedRemittance, setExpandedRemittance] = useState<string | null>(null);
  const [remittancePage, setRemittancePage] = useState(1);

  useEffect(() => { if (profile) fetchData(); }, [profile]);
  useEffect(() => { setPage(1); }, [search, filterProject, filterLeader, filterStatus]);

  const fetchData = async () => {
    if (!profile) return;
    if (isSuperAdmin) {
      const [donationsRes, projectsRes, leadersRes, remittancesRes] = await Promise.all([
        supabase.from('donations').select('*, donors(nom), leaders(nom_affichage, nom_equipe, slug), projects(nom), balance_transactions(amount, fee, net)').order('created_at', { ascending: false }),
        supabase.from('projects').select('*'),
        supabase.from('leaders').select('*'),
        supabase.from('remittances').select('*, balance_transactions(amount, fee, net), leaders(nom_affichage, nom_equipe)').order('created_at', { ascending: false }),
      ]);
      setDonations((donationsRes.data || []) as unknown as Donation[]);
      setProjects((projectsRes.data || []) as Project[]);
      setLeaders((leadersRes.data || []) as Leader[]);
      setRemittances((remittancesRes.data || []) as unknown as Remittance[]);
    } else {
      const leaderRes = await supabase.from('leaders').select('*').eq('user_id', profile.id).maybeSingle();
      const myLeader = leaderRes.data as Leader | null;
      if (!myLeader) { setLoading(false); return; }
      setMyLeaderId(myLeader.id);
      const [donationsRes, projectsRes, cashRes, remittancesRes] = await Promise.all([
        supabase.from('donations').select('*, donors(nom), leaders(nom_affichage, nom_equipe, slug), projects(nom), balance_transactions(amount, fee, net)').or(`leader_id.eq.${myLeader.id},leader_id.is.null`).order('created_at', { ascending: false }),
        supabase.from('projects').select('*'),
        getCashReceivedForLeader(myLeader.id),
        supabase.from('remittances').select('*, balance_transactions(amount, fee, net)').eq('leader_id', myLeader.id).order('created_at', { ascending: false }),
      ]);
      setDonations((donationsRes.data || []) as unknown as Donation[]);
      const loadedProjects = (projectsRes.data || []) as Project[];
      setProjects(loadedProjects);
      setRemittances((remittancesRes.data || []) as unknown as Remittance[]);
      if (cashRes.ok) {
        setCashPending(cashRes.data);
        setSelectedIds(new Set(cashRes.data.map(d => d.id)));
      }
      // Vérifie si le leader a un IBAN configuré
      if (myLeader.donor_id) {
        const donorRes = await supabase.from('donors').select('id, stripe_payment_method_id').eq('id', myLeader.donor_id).maybeSingle();
        if (donorRes.data?.stripe_payment_method_id) {
          setLeaderHasSepa(true);
          setLeaderDonorId(donorRes.data.id);
        }
      }
      if (loadedProjects.length > 0) setPersonalProjectId(p => p || loadedProjects[0].id);
    }
    setLoading(false);
  };

  const openVirementModal = () => {
    setSelectedIds(new Set(cashPending.map(d => d.id)));
    setPersonalAmount('');
    if (projects.length > 0) setPersonalProjectId(projects[0].id);
    setShowModal(true);
  };

  const handleConfirmVirement = async () => {
    if (!myLeaderId || selectedIds.size === 0) return;
    setRemittanceLoading(true);
    setRemittanceResult(null);
    setShowModal(false);
    const ids = Array.from(selectedIds);
    const parsedPersonal = parseFloat(personalAmount);
    const result = await triggerCashRemittance(
      myLeaderId,
      ids,
      parsedPersonal > 0 && leaderDonorId && personalProjectId
        ? { personalAmount: parsedPersonal, personalDonorId: leaderDonorId, personalProjectId }
        : undefined
    );
    if (result.ok) {
      const total = cashPending.filter(d => ids.includes(d.id)).reduce((s, d) => s + d.montant, 0)
        + (parsedPersonal > 0 ? parsedPersonal : 0);
      setRemittanceResult({ ok: true, message: `Virement de ${fmt(total)} initié — les dons seront soldés à confirmation Stripe.` });
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

  const REM_PAGE_SIZE = 6;
  const groupedRemittances = remittances.filter(r =>
    donations.filter(d => d.remittance_id === r.id).length > 1
  );
  const remTotalPages = Math.max(1, Math.ceil(groupedRemittances.length / REM_PAGE_SIZE));
  const paginatedRemittances = groupedRemittances.slice((remittancePage - 1) * REM_PAGE_SIZE, remittancePage * REM_PAGE_SIZE);

  // Frais pro-raté : divisé par le nombre total de dons liés à chaque virement
  const remittanceFeePerDon = new Map<string, number>();
  for (const r of remittances) {
    if (r.balance_transactions?.fee) {
      const linked = donations.filter(d => d.remittance_id === r.id);
      // Le don personnel (prelevement_sepa paid) compte dans le total pour la répartition
      remittanceFeePerDon.set(r.id, r.balance_transactions.fee / (linked.length || 1));
    }
  }

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
            onClick={openVirementModal}
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
            <div className="hidden sm:grid grid-cols-[1.8fr_1.3fr_1.2fr_110px_100px_80px_90px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Donateur</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projet</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Équipe</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Méthode</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Frais</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</span>
            </div>

            <div className="divide-y divide-gray-50">
              {paginated.map(d => {
                const fee = d.remittance_id
                  ? (remittanceFeePerDon.get(d.remittance_id) ?? null)
                  : (d.balance_transactions?.fee ?? null);
                const feeLabel = fee != null && fee > 0
                  ? `-${fee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
                  : '—';
                return (
                <div key={d.id} className="flex sm:grid sm:grid-cols-[1.8fr_1.3fr_1.2fr_110px_100px_80px_90px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors">
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
                  {/* Frais */}
                  <span className="hidden sm:block text-sm text-rose-500 whitespace-nowrap">{feeLabel}</span>
                  {/* Statut */}
                  <div className="hidden sm:block"><Badge status={d.statut} method={d.methode} /></div>
                </div>
                );
              })}
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

      {/* Section Virements groupés d'espèces — accordion */}
      {groupedRemittances.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Banknote className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Virements groupés d&apos;espèces</h2>
          </div>

          {/* En-têtes colonnes virement */}
          <div className={`hidden sm:grid gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 ${isSuperAdmin ? 'grid-cols-[24px_1fr_1.2fr_90px_100px_80px_90px]' : 'grid-cols-[24px_1fr_90px_100px_80px_90px]'}`}>
            <span />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</span>
            {isSuperAdmin && <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Équipe</span>}
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dons</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Frais</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</span>
          </div>

          <div className="divide-y divide-gray-50">
            {paginatedRemittances.map(r => {
              const linkedDons = donations.filter(d => d.remittance_id === r.id);
              const donCount = linkedDons.length;
              const totalFee = r.balance_transactions?.fee ?? null;
              const feeLabel = totalFee != null && totalFee > 0
                ? `-${totalFee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
                : '—';
              const perDonFee = totalFee != null && donCount > 0 ? totalFee / donCount : null;
              const perDonFeeLabel = perDonFee != null && perDonFee > 0
                ? `-${perDonFee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
                : '—';
              const leaderName = (() => { const l = r.leaders; return l?.nom_equipe || l?.nom_affichage || '—'; })();
              const isExpanded = expandedRemittance === r.id;
              const gridCols = isSuperAdmin
                ? 'sm:grid-cols-[24px_1fr_1.2fr_90px_100px_80px_90px]'
                : 'sm:grid-cols-[24px_1fr_90px_100px_80px_90px]';
              return (
                <div key={r.id}>
                  {/* Ligne virement */}
                  <button
                    onClick={() => setExpandedRemittance(isExpanded ? null : r.id)}
                    className={`w-full flex sm:grid items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 text-left transition-colors ${isExpanded ? 'bg-amber-50' : 'hover:bg-gray-50'} ${gridCols}`}
                  >
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    <div className="flex-1 sm:flex-none min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400 sm:hidden">{donCount} don{donCount > 1 ? 's' : ''} · {fmt(r.montant)}</p>
                    </div>
                    {isSuperAdmin && <p className="hidden sm:block text-sm text-gray-600 truncate">{leaderName}</p>}
                    <span className="hidden sm:block text-sm text-gray-600">{donCount} don{donCount > 1 ? 's' : ''}</span>
                    <span className="hidden sm:block text-sm font-bold text-amber-600 whitespace-nowrap">{fmt(r.montant)}</span>
                    <span className="hidden sm:block text-sm text-rose-500 whitespace-nowrap">{feeLabel}</span>
                    <div className="hidden sm:block"><Badge status={r.statut} method="prelevement_sepa" /></div>
                  </button>

                  {/* Dons détaillés — accordéon */}
                  {isExpanded && (
                    <div className="border-t border-amber-100 bg-amber-50/50">
                      {linkedDons.length === 0 ? (
                        <p className="px-8 py-3 text-xs text-gray-400">Aucun don associé trouvé.</p>
                      ) : (
                        <>
                          {/* En-têtes dons détaillés */}
                          <div className="hidden sm:grid grid-cols-[2fr_1.5fr_90px_80px_90px] gap-3 px-8 py-2 border-b border-amber-100">
                            <span className="text-xs font-semibold text-amber-700/60 uppercase tracking-wider">Donateur</span>
                            <span className="text-xs font-semibold text-amber-700/60 uppercase tracking-wider">Projet</span>
                            <span className="text-xs font-semibold text-amber-700/60 uppercase tracking-wider">Montant</span>
                            <span className="text-xs font-semibold text-amber-700/60 uppercase tracking-wider">Frais</span>
                            <span className="text-xs font-semibold text-amber-700/60 uppercase tracking-wider">Statut</span>
                          </div>
                          <div className="divide-y divide-amber-100">
                            {linkedDons.map(d => (
                              <div key={d.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1.5fr_90px_80px_90px] gap-3 px-8 py-3 items-center">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {(d.donors as { nom: string } | null)?.nom || 'Anonyme'}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                    <span className="sm:hidden"> · {fmt(d.montant)} · {perDonFeeLabel}</span>
                                  </p>
                                </div>
                                <p className="hidden sm:block text-sm text-gray-600 truncate">
                                  {(d.projects as { nom: string } | null)?.nom || '—'}
                                </p>
                                <span className="hidden sm:block text-sm font-semibold text-emerald-600 whitespace-nowrap">{fmt(d.montant)}</span>
                                <span className="hidden sm:block text-sm text-rose-500 whitespace-nowrap">{perDonFeeLabel}</span>
                                <div className="hidden sm:block"><Badge status={d.statut} method={d.methode} /></div>
                                <span className="sm:hidden text-sm font-semibold text-emerald-600 whitespace-nowrap">{fmt(d.montant)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination virements — toujours visible */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                Page {remittancePage} sur {remTotalPages} · {groupedRemittances.length} virement{groupedRemittances.length > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setRemittancePage(p => Math.max(1, p - 1)); setExpandedRemittance(null); }}
                  disabled={remittancePage === 1}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: remTotalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => { setRemittancePage(n); setExpandedRemittance(null); }}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${n === remittancePage ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => { setRemittancePage(p => Math.min(remTotalPages, p + 1)); setExpandedRemittance(null); }}
                  disabled={remittancePage === remTotalPages}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
        </div>
      )}

      {/* Modal — Virement d'espèces (même composant que mon-espace) */}
      {showModal && (() => {
        const selectedList = cashPending.filter(d => selectedIds.has(d.id));
        const cashTotal = selectedList.reduce((s, d) => s + d.montant, 0);
        const perso = parseFloat(personalAmount) || 0;
        const totalSepa = cashTotal + perso;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <h2 className="font-semibold text-gray-900">Virement d&apos;espèces</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corps scrollable */}
              <div className="overflow-y-auto px-6 py-4 space-y-2 flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dons à inclure</p>
                {cashPending.map(d => (
                  <label key={d.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(d.id)}
                      onChange={() => setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                        return next;
                      })}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.donorNom}</p>
                      <p className="text-xs text-gray-400">{d.projectNom}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{fmt(d.montant)}</span>
                  </label>
                ))}

                {/* Don personnel */}
                {leaderHasSepa && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Don personnel <span className="font-normal normal-case text-gray-400">(optionnel)</span></p>
                    <div className="flex gap-2">
                      <select
                        value={personalProjectId}
                        onChange={e => setPersonalProjectId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-emerald-400 bg-white"
                      >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                      </select>
                      <div className="relative w-32">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={personalAmount}
                          onChange={e => setPersonalAmount(e.target.value)}
                          placeholder="Montant"
                          className="w-full pl-3 pr-6 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer récapitulatif */}
              <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 space-y-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{selectedList.length} don{selectedList.length > 1 ? 's' : ''} espèces</span>
                    <span className="font-medium">{fmt(cashTotal)}</span>
                  </div>
                  {perso > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Don personnel</span>
                      <span className="font-medium">{fmt(perso)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                    <span>Total SEPA</span>
                    <span>{fmt(totalSepa)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmVirement}
                    disabled={remittanceLoading || selectedList.length === 0}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {remittanceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                    Confirmer {fmt(totalSepa)}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

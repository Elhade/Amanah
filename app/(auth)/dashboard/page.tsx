'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Users, TrendingUp, HandHeart, ArrowRight, Clock, Target, Receipt } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { MethodBadge } from '@/components/ui/MethodBadge';
import { getDashboardData } from '@/services/dashboard.service';
import type { DashboardData } from '@/services/dashboard.service';
import type { Leader, DonationStatus } from '@/types';

const GHOST: Leader = { id: '__ghost__', nom_affichage: 'Ghost Team', nom_equipe: null, slug: '', user_id: null, created_at: '' };
const PALETTE = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6'];

interface Segment { label: string; value: number; color: string; }

function DonutChart({ segments, total }: { segments: Segment[]; total: number }) {
  const r = 48, sw = 16, c = 2 * Math.PI * r;
  const active = segments.filter(s => s.value > 0);
  if (total === 0 || active.length === 0) {
    return (
      <svg viewBox="0 0 110 110" className="w-full max-w-[110px] 2xl:max-w-[140px]">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      </svg>
    );
  }
  let cum = 0;
  return (
    <svg viewBox="0 0 110 110" className="w-full max-w-[110px] 2xl:max-w-[140px]" style={{ transform: 'rotate(-90deg)' }}>
      {active.map((seg, i) => {
        const dash = (seg.value / total) * c;
        const offset = c - cum;
        cum += dash;
        return (
          <circle key={i} cx="55" cy="55" r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
          />
        );
      })}
    </svg>
  );
}

interface LeaderStat { leader: Leader; total: number; count: number; }

const RANK_STYLES = [
  { badge: 'bg-amber-400 text-white',  row: 'rgba(251,191,36,0.10)'  }, // or
  { badge: 'bg-gray-300 text-white',   row: 'rgba(209,213,219,0.25)' }, // argent
  { badge: 'bg-amber-700 text-white',  row: 'rgba(180,83,9,0.08)'    }, // bronze
];

function ClassementCard({ leaderStats, fmt, className = '' }: {
  leaderStats: LeaderStat[];
  fmt: (n: number) => string;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-gray-50">
        <TrendingUp className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-900">Classement</h2>
      </div>
      <div className="px-4 pb-4 divide-y divide-gray-50">
        {leaderStats.map(({ leader, total, count }, i) => {
          const style = RANK_STYLES[i];
          return (
            <div key={leader.id} className="flex items-center gap-3 py-3">
              <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                style ? style.badge : 'bg-gray-100 text-gray-400'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{leader.nom_equipe || leader.nom_affichage}</p>
                <p className="text-xs text-gray-400">{count} don{count > 1 ? 's' : ''}</p>
              </div>
              <span className={`text-sm font-bold whitespace-nowrap ${i === 0 ? 'text-amber-600' : 'text-gray-700'}`}>{fmt(total)}</span>
            </div>
          );
        })}
        {leaderStats.length === 0 && <p className="text-gray-400 text-xs py-6 text-center">Aucun responsable</p>}
      </div>
    </div>
  );
}

const METHOD_CONFIG = [
  { label: 'Carte',            methode: 'card',             bar: 'bg-emerald-600' },
  { label: 'Prélèvement SEPA', methode: 'prelevement_sepa', bar: 'bg-emerald-300' },
  { label: 'Espèces',          methode: 'cash',             bar: 'bg-amber-400'   },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [myLeaderId, setMyLeaderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    getDashboardData().then((d) => {
      setData(d);
      if (profile) {
        const found = d.leaders.find(l => l.user_id === profile.id);
        setMyLeaderId(found?.id ?? null);
      }
      setLoading(false);
    });
  }, [profile]);

  const isAdmin = profile?.role === 'super_admin';

  const fmt = (n: number) => `${(n ?? 0).toLocaleString('fr-FR')} €`;
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

  const scopedDonations = useMemo(() => {
    if (!data) return [];
    return selectedProject
      ? data.allDonations.filter(d => d.project_id === selectedProject)
      : data.allDonations;
  }, [data, selectedProject]);

  // Stripe uniquement (argent en banque)
  const settled = useMemo(() =>
    scopedDonations.filter(d => d.statut === 'paid'),
  [scopedDonations]);
  // Espèces versées en banque
  const cashRemitted = useMemo(() =>
    scopedDonations.filter(d => d.statut === 'cash_remitted'),
  [scopedDonations]);
  // Espèces reçues mais pas encore virées
  const cashReceived = useMemo(() =>
    scopedDonations.filter(d => d.statut === 'cash_received'),
  [scopedDonations]);

  // Total collecté = tout ce qui est engagé (paid + cashRemitted + cashReceived)
  const totalSettled = useMemo(() =>
    [...settled, ...cashRemitted, ...cashReceived].reduce((s, d) => s + d.montant, 0),
  [settled, cashRemitted, cashReceived]);
  // Montant en attente de versement
  const totalPending = useMemo(() =>
    cashReceived.reduce((s, d) => s + d.montant, 0),
  [cashReceived]);
  // Donateurs uniques sur tout ce qui est engagé
  const allEngaged = useMemo(() =>
    scopedDonations.filter(d => ['paid', 'cash_remitted', 'cash_received'].includes(d.statut)),
  [scopedDonations]);
  const donorCount = useMemo(() =>
    new Set(allEngaged.map(d => d.donor_id).filter(Boolean)).size,
  [allEngaged]);
  const donationCount = scopedDonations.length;

  // Classement : basé sur l'argent engagé (encaissé + cash_remitted + cash_received)
  const leaderStats = useMemo(() => {
    if (!data) return [];
    const stats = data.leaders.map(l => {
      const lDons = allEngaged.filter(d => d.leader_id === l.id);
      return { leader: l, total: lDons.reduce((s, d) => s + d.montant, 0), count: lDons.length };
    });
    const ghostDons = allEngaged.filter(d => !d.leader_id);
    if (ghostDons.length > 0)
      stats.push({ leader: GHOST, total: ghostDons.reduce((s, d) => s + d.montant, 0), count: ghostDons.length });
    return stats.sort((a, b) => b.total - a.total);
  }, [data, allEngaged]);

  const leaderSegments = useMemo(() =>
    leaderStats.filter(l => l.total > 0)
      .map((l, i) => ({ label: l.leader.nom_equipe || l.leader.nom_affichage, value: l.total, color: PALETTE[i % PALETTE.length] })),
  [leaderStats]);
  const donutTotal = useMemo(() => leaderSegments.reduce((s, seg) => s + seg.value, 0), [leaderSegments]);


  const projectStats = useMemo(() => {
    if (!data) return [];
    return data.projects.map(p => {
      const pCard   = settled.filter(d => d.project_id === p.id && d.methode === 'card');
      const pSepa   = settled.filter(d => d.project_id === p.id && d.methode === 'prelevement_sepa');
      const pVersé  = cashRemitted.filter(d => d.project_id === p.id);
      const pReçu   = cashReceived.filter(d => d.project_id === p.id);
      return {
        project: p,
        total:          [...pCard, ...pSepa, ...pVersé, ...pReçu].reduce((s, d) => s + d.montant, 0),
        totalCard:      pCard.reduce((s, d) => s + d.montant, 0),
        totalSepa:      pSepa.reduce((s, d) => s + d.montant, 0),
        totalCashRemitted: pVersé.reduce((s, d) => s + d.montant, 0),
        totalCashReceived:  pReçu.reduce((s, d) => s + d.montant, 0),
      };
    });
  }, [data, settled, cashRemitted, cashReceived]);

  const activeLeaders = useMemo(() => leaderStats.filter(l => l.count > 0).length, [leaderStats]);
  const recentDonations = data?.allDonations.slice(0, 6) ?? [];

  const totalFrais = useMemo(() => {
    const donFrais = (data?.allDonations ?? []).reduce((s, d) => s + (d.balance_transactions?.fee ?? 0), 0);
    const remFrais = (data?.allRemittances ?? []).reduce((s, r) => s + (r.balance_transactions?.fee ?? 0), 0);
    return donFrais + remFrais;
  }, [data]);

  // Frais par don pour les espèces : frais de la remittance / nombre de dons couverts
  const remittanceFeePerDon = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const r of data.allRemittances) {
      if (r.balance_transactions?.fee) {
        const count = data.allDonations.filter(d => d.remittance_id === r.id).length || 1;
        map.set(r.id, r.balance_transactions.fee / count);
      }
    }
    return map;
  }, [data]);

  const methodStats = useMemo(() => {
    const engaged = scopedDonations.filter(d => ['paid', 'cash_remitted', 'cash_received'].includes(d.statut));
    const total = engaged.length;
    return METHOD_CONFIG.map(({ label, methode, bar }) => {
      const dons = engaged.filter(d => d.methode === methode);
      return { label, bar, count: dons.length, montant: dons.reduce((s, d) => s + d.montant, 0),
        pct: total ? Math.round(dons.length / total * 100) : 0 };
    }).filter(s => s.count > 0);
  }, [scopedDonations]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  const totalNet = totalSettled - totalFrais;

  const kpiCards = (
    <>
      {/* Total encaissé — col-span-2, layout horizontal */}
      <div className="col-span-2 bg-white rounded-2xl p-4 sm:p-5 2xl:p-7 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center gap-4 h-full">
          <div className="bg-emerald-50 p-2 sm:p-3 rounded-xl flex-shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 2xl:w-7 2xl:h-7 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Total encaissé</p>
            <p className="text-xl sm:text-2xl 2xl:text-3xl font-bold text-emerald-700 whitespace-nowrap">{fmt(totalNet)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Net après frais</p>
          </div>
          <div className="border-l border-gray-100 pl-4 flex-shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-5">
              <span className="text-xs text-gray-400">Brut</span>
              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{fmt(totalSettled)}</span>
            </div>
            <div className="flex items-center justify-between gap-5">
              <span className="text-xs text-gray-400">Frais</span>
              <span className="text-xs font-semibold text-rose-500 whitespace-nowrap">
                -{totalFrais.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </div>
      </div>

      <StatCard title="Frais Stripe" value={fmt(totalFrais)} icon={Receipt} iconColor="text-rose-600" iconBg="bg-rose-50" valueColor="text-rose-600" subtitle="Coût total des transactions" />
      {/* En attente — carte custom (amber dynamique + count) */}
      <div className="rounded-2xl p-4 sm:p-5 2xl:p-7 shadow-sm border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 leading-snug">Espèces<br />en attente</p>
            <p className={`text-xl sm:text-2xl 2xl:text-3xl font-bold mt-1 whitespace-nowrap ${totalPending > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
              {fmt(totalPending)}
            </p>
            <p className={`text-xs mt-0.5 ${totalPending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {cashReceived.length > 0
                ? `${cashReceived.length} don${cashReceived.length > 1 ? 's' : ''} · chez les leaders`
                : 'Aucune espèce en attente'}
            </p>
          </div>
          <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ml-2 ${totalPending > 0 ? 'bg-amber-100' : 'bg-gray-50'}`}>
            <HandHeart className={`w-5 h-5 sm:w-6 sm:h-6 2xl:w-7 2xl:h-7 ${totalPending > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Donateurs + Responsables fusionnés */}
      <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 sm:p-5 2xl:p-7 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
          <div className="bg-blue-50 p-2 rounded-xl flex-shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Donateurs</p>
            <p className="text-lg sm:text-xl 2xl:text-2xl font-bold text-gray-900">{donorCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 p-2 rounded-xl flex-shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Responsables actifs</p>
            <p className="text-lg sm:text-xl 2xl:text-2xl font-bold text-gray-900">{activeLeaders}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-400 text-sm mt-0.5">Vue d&apos;ensemble de toutes les collectes</p>
        </div>
      </div>

      {/* KPIs pleine largeur — desktop lg+ uniquement */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-4 2xl:gap-6">
        {kpiCards}
      </div>

      {/* Bandeau en attente de versement — si montant > 0 */}
      {totalPending > 0 && (
        <div className="hidden lg:flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{fmt(totalPending)}</span> en espèces reçus par les responsables, en attente de versement
          </p>
        </div>
      )}

      {/* Corps principal — mobile : en premier (order-1) ; lg+ : après les KPIs (order-2)
            mobile  → 1 col empilé (Projets en haut)
            lg      → [260px Projets sticky | 1fr contenu+classement]
            xl      → [290px Projets | 1fr contenu | 240px classement sticky] */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[270px_1fr_270px] 2xl:grid-cols-[330px_1fr_330px] gap-4 sm:gap-6 items-start">

        {/* ── Gauche sticky : Progression ── */}
        <div className="lg:sticky lg:top-6 space-y-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-gray-900">Projets</h2>
            </div>
            <div className="px-4 pb-4 space-y-1 max-h-[300px] sm:max-h-[420px] lg:max-h-[560px] xl:max-h-[680px] 2xl:max-h-[860px] overflow-y-auto">
              {/* Tous */}
              {(() => {
                const allCard   = projectStats.reduce((s, p) => s + p.totalCard, 0);
                const allSepa   = projectStats.reduce((s, p) => s + p.totalSepa, 0);
                const allVersé  = projectStats.reduce((s, p) => s + p.totalCashRemitted, 0);
                const allReçu   = projectStats.reduce((s, p) => s + p.totalCashReceived, 0);
                const allTotal  = allCard + allSepa + allVersé + allReçu;
                const allObjectif = data.projects.reduce((s, p) => s + (p.objectif || 0), 0);
                const isAll = selectedProject === null;
                return (
                  <button
                    onClick={() => setSelectedProject(null)}
                    className={`w-full text-left rounded-xl px-3 py-3 lg:py-2.5 2xl:py-3.5 min-h-[48px] lg:min-h-0 transition-all ${isAll ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm lg:text-xs 2xl:text-sm font-semibold ${isAll ? 'text-emerald-700' : 'text-gray-700'}`}>Tous les projets</span>
                      <span className="text-xs 2xl:text-sm text-gray-400">{fmt(allTotal)}</span>
                    </div>
                    <ProgressBar value={allCard} valueSepa={allSepa} valueCashRemitted={allVersé} valueCashReceived={allReçu} max={allObjectif || allTotal || 1} showPercentage={false} />
                  </button>
                );
              })()}
              {/* Par projet */}
              {projectStats.map(({ project, total, totalCard, totalSepa, totalCashRemitted, totalCashReceived }) => {
                const isSelected = selectedProject === project.id;
                const pct = project.objectif > 0 ? Math.min(Math.round(total / project.objectif * 100), 100) : 0;
                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(isSelected ? null : project.id)}
                    className={`w-full text-left rounded-xl px-3 py-3 lg:py-2.5 2xl:py-3.5 min-h-[48px] lg:min-h-0 transition-all ${isSelected ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm lg:text-xs 2xl:text-sm font-semibold truncate pr-2 ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>{project.nom}</span>
                      <span className="text-xs 2xl:text-sm text-gray-400 whitespace-nowrap">{project.objectif > 0 ? `${pct}%` : fmt(total)}</span>
                    </div>
                    <ProgressBar value={totalCard} valueSepa={totalSepa} valueCashRemitted={totalCashRemitted} valueCashReceived={totalCashReceived} max={project.objectif || total || 1} showPercentage={false} />
                  </button>
                );
              })}
              {projectStats.length === 0 && <p className="text-gray-400 text-xs text-center py-6">Aucun projet</p>}
            </div>
          </div>
        </div>

        {/* ── Centre : Répartition + Méthode + Activité (+ Classement < xl) ── */}
        <div className="space-y-6">

          {/* KPIs mobile — uniquement < lg, juste après Projets */}
          <div className="grid lg:hidden grid-cols-2 gap-3 sm:gap-4">
            {kpiCards}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Donut */}
            <div className="bg-white rounded-2xl p-5 2xl:p-7 shadow-sm border border-gray-100">
              <h2 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-4 2xl:mb-5">Répartition par responsable</h2>
              <div className="flex justify-center mb-4 relative">
                <DonutChart segments={leaderSegments} total={donutTotal} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-gray-900">{fmt(donutTotal)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {leaderSegments.map(({ label, value, color }) => {
                  const pct = donutTotal ? Math.round(value / donutTotal * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-gray-700 flex-1">{label}</span>
                      <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{pct}%</span>
                    </div>
                  );
                })}
                {leaderSegments.length === 0 && <p className="text-gray-400 text-xs text-center">Aucune donnée</p>}
              </div>
            </div>

            {/* Méthode */}
            <div className="bg-white rounded-2xl p-5 2xl:p-7 shadow-sm border border-gray-100">
              <h2 className="text-sm 2xl:text-base font-semibold text-gray-900 mb-4 2xl:mb-5">Méthode de paiement</h2>
              <div className="space-y-4">
                {methodStats.map(({ label, bar, count, montant, pct }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-700">{label}</span>
                      <span className="text-xs text-gray-500">{pct}% · <span className="font-semibold text-gray-700">{fmt(montant)}</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
                {methodStats.length === 0 && <p className="text-gray-400 text-xs py-4 text-center">Aucun don</p>}
              </div>
              {methodStats.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between">
                  <span className="text-xs text-gray-500">Total encaissé</span>
                  <span className="text-xs font-bold text-gray-900">{fmt(totalSettled)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Classement — visible uniquement sur < xl (intégré dans le flux) */}
          <ClassementCard leaderStats={leaderStats} fmt={fmt} className="xl:hidden" />
        </div>

        {/* ── Droite sticky : Classement — visible uniquement xl ── */}
        <div className="hidden xl:block xl:sticky xl:top-6">
          <ClassementCard leaderStats={leaderStats} fmt={fmt} />
        </div>

      </div>

      {/* ── Activité récente — pleine largeur sous la grille ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 2xl:px-7 py-4 2xl:py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 2xl:w-5 2xl:h-5 text-gray-400" />
            <h2 className="text-sm 2xl:text-base font-semibold text-gray-900">Activité récente</h2>
          </div>
          <button onClick={() => router.push('/historique')} className="flex items-center gap-1 text-xs 2xl:text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            Tout voir <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {recentDonations.length === 0 ? (
          <div className="text-center py-10">
            <HandHeart className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucun don pour le moment</p>
          </div>
        ) : (
          <>
            {/* En-têtes colonnes — sm+ */}
            <div className="hidden sm:grid grid-cols-[1.8fr_1.3fr_1.2fr_110px_100px_80px_90px] gap-4 px-5 2xl:px-7 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Donateur</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projet</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Équipe</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Méthode</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Frais</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</span>
            </div>
            <div className="divide-y divide-gray-50">
              {recentDonations.map((d) => {
                const canSeeName = isAdmin || d.leader_id === myLeaderId || !d.leader_id;
                const donorName = canSeeName
                  ? ((d.donors as { nom: string } | null)?.nom || 'Anonyme')
                  : '—';
                const fee = d.remittance_id
                  ? (remittanceFeePerDon.get(d.remittance_id) ?? null)
                  : (d.balance_transactions?.fee ?? null);
                const feeLabel = fee != null && fee > 0
                  ? `-${fee.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
                  : '—';
                return (
                  <div key={d.id} className="flex sm:grid sm:grid-cols-[1.8fr_1.3fr_1.2fr_110px_100px_80px_90px] items-center gap-3 sm:gap-4 px-4 sm:px-5 2xl:px-7 py-3.5 sm:py-4 2xl:py-5 hover:bg-gray-50 transition-colors min-h-[52px] sm:min-h-0">
                    {/* Donateur + date */}
                    <div className="flex-1 sm:flex-none min-w-0">
                      <p className="text-sm 2xl:text-base font-medium text-gray-800 truncate">{donorName}</p>
                      <p className="text-xs 2xl:text-sm text-gray-400">{fmtDate(d.created_at)}</p>
                    </div>
                    {/* Projet */}
                    <p className="hidden sm:block text-sm 2xl:text-base text-gray-600 truncate">
                      {(d.projects as { nom: string } | null)?.nom || '—'}
                    </p>
                    {/* Équipe */}
                    <p className="hidden sm:block text-sm 2xl:text-base text-gray-600 truncate">
                      {(() => { const l = d.leaders as { nom_affichage: string; nom_equipe?: string | null } | null; return l?.nom_equipe || l?.nom_affichage || 'Ghost Team'; })()}
                    </p>
                    {/* Méthode */}
                    <div className="hidden sm:block"><MethodBadge method={d.methode} /></div>
                    {/* Montant */}
                    <span className="text-sm 2xl:text-base font-bold text-emerald-600 whitespace-nowrap">{fmt(d.montant)}</span>
                    {/* Frais */}
                    <span className="hidden sm:block text-sm 2xl:text-base text-rose-500 whitespace-nowrap">{feeLabel}</span>
                    {/* Statut */}
                    <div className="hidden sm:block"><Badge status={d.statut} method={d.methode} /></div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HandHeart, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

import { PRESET_AMOUNTS } from '@/components/home/donation/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminFormData } from '@/services/dashboard.service';
import { submitCashDonation, getRecentDonationsForLeader } from '@/actions/donation.actions';
import type { RecentDonationRow } from '@/actions/donation.actions';
import type { Project, Leader, Donation } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface DonorRanking { nom: string; total: number; count: number; }
interface DonorSuggestion { id: string; nom: string; }

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' €';

const medalColor = (i: number) =>
  i === 0 ? 'bg-amber-400 text-white' :
  i === 1 ? 'bg-gray-400 text-white' :
  i === 2 ? 'bg-amber-700 text-white' :
            'bg-gray-100 text-gray-500';

export default function AjouterDonPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [myLeader, setMyLeader] = useState<Leader | null>(null);
  const [donorRanking, setDonorRanking] = useState<DonorRanking[]>([]);
  const [myDonors, setMyDonors] = useState<DonorSuggestion[]>([]);
  const [suggestions, setSuggestions] = useState<DonorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState({ donorName: '', donorId: '', projectId: '', leaderId: '' });
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recentDonations, setRecentDonations] = useState<RecentDonationRow[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === 'super_admin';

  useEffect(() => { fetchData(); }, [profile]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchData = async () => {
    const { projects: loadedProjects, leaders: loadedLeaders } = await getAdminFormData();
    setProjects(loadedProjects);
    setLeaders(loadedLeaders);

    let foundLeader: Leader | null = null;
    if (profile) {
      foundLeader = loadedLeaders.find(l => l.user_id === profile.id) || null;
      setMyLeader(foundLeader);
      if (foundLeader) setForm(f => ({ ...f, leaderId: foundLeader!.id }));
    }
    if (loadedProjects.length > 0) setForm(f => ({ ...f, projectId: loadedProjects[0].id }));

    await refreshRanking(foundLeader?.id);
    if (foundLeader) await refreshRecentDonations(foundLeader.id);
  };

  const refreshRecentDonations = async (leaderId: string) => {
    const result = await getRecentDonationsForLeader(leaderId);
    if (result.ok) setRecentDonations(result.data);
  };

  const refreshRanking = async (leaderId?: string) => {
    setLoadingRanking(true);
    const effectiveLeaderId = leaderId ?? myLeader?.id;
    const query = supabase.from('donations').select('donor_id, montant, donors(nom)');
    const { data } = isAdmin ? await query : await query.eq('leader_id', effectiveLeaderId ?? '');
    const donations = (data ?? []) as unknown as Donation[];
    const rankMap = new Map<string, DonorRanking>();
    const donorMap = new Map<string, DonorSuggestion>();
    for (const d of donations) {
      const nom = (d.donors as { nom: string } | null)?.nom || 'Anonyme';
      const cur = rankMap.get(nom) ?? { nom, total: 0, count: 0 };
      rankMap.set(nom, { nom, total: cur.total + d.montant, count: cur.count + 1 });
      if (d.donor_id && !donorMap.has(d.donor_id))
        donorMap.set(d.donor_id, { id: d.donor_id, nom });
    }
    setDonorRanking(Array.from(rankMap.values()).sort((a, b) => b.total - a.total));
    setMyDonors(Array.from(donorMap.values()));
    setLoadingRanking(false);
  };

  const handleDonorNameChange = (value: string) => {
    setForm(f => ({ ...f, donorName: value, donorId: '' }));
    if (value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const results = myDonors.filter(d => d.nom.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  const selectSuggestion = (s: DonorSuggestion) => {
    setForm(f => ({ ...f, donorName: s.nom, donorId: s.id }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const resolvedMontant = customAmount ? parseFloat(customAmount) : (selectedAmount ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!resolvedMontant || resolvedMontant <= 0) { setError('Le montant doit être supérieur à 0.'); setLoading(false); return; }
    try {
      await submitCashDonation({
        donorName: form.donorName.trim(),
        donorId: form.donorId || undefined,
        montant: resolvedMontant,
        projectId: form.projectId,
        leaderId: form.leaderId || null,
      });
      setSuccess(true);
      setForm(f => ({ ...f, donorName: '', donorId: '' }));
      setSelectedAmount(null);
      setCustomAmount('');
      setTimeout(() => setSuccess(false), 4000);
      refreshRanking();
      if (myLeader) refreshRecentDonations(myLeader.id);
    } catch {
      setError("Erreur lors de l'enregistrement du don.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajouter un don</h1>
        <p className="text-gray-500 text-sm mt-1">Enregistrer un don en espèces</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Don enregistré avec succès !</p>
            <button onClick={() => router.push('/historique')} className="text-sm text-emerald-600 hover:underline">
              Voir l&apos;historique →
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Formulaire compact pleine largeur */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* ── DESKTOP : grille 7 colonnes, tout sur la même ligne ─────────────
               Col:  1=Donateur  2=Projet  3=5  4=10  5=20  6=input  7=Valider
               Ligne 2 : 50/100/200 placés explicitement en cols 3-4-5           */}
          <div
            className="hidden lg:grid gap-x-2 gap-y-1.5"
            style={{ gridTemplateColumns: '1.4fr 1.8fr 1fr 1fr 1fr 1.4fr auto', alignItems: 'end' }}
          >
            {/* Donateur */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Donateur <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={suggestionsRef}>
                <input
                  type="text"
                  value={form.donorName}
                  onChange={e => handleDonorNameChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  autoComplete="off"
                  required
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all ${form.donorId ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'}`}
                  placeholder="Nom…"
                />
                {form.donorId && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-medium bg-emerald-100 px-1.5 py-0.5 rounded-full">✓</span>
                )}
                {showSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map(s => (
                      <button key={s.id} type="button" onMouseDown={() => selectSuggestion(s)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                        {s.nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Projet */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Projet <span className="text-red-500">*</span></label>
              <select
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all bg-white"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>

            {/* Ligne 1 : petits montants (cols 3-5) */}
            {[5, 10, 20].map(amount => (
              <button key={amount} type="button"
                onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedAmount === amount && !customAmount
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {amount}
              </button>
            ))}

            {/* Col 6 : input montant libre */}
            <div className="relative">
              <input
                type="number"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                min="1" step="1"
                className="w-full pl-2 pr-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-emerald-400 transition-all font-medium"
                placeholder="Montant €"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
            </div>

            {/* Col 7 : Valider */}
            <button
              type="submit"
              disabled={loading || !resolvedMontant || !form.projectId || !form.donorName.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none whitespace-nowrap"
            >
              {loading
                ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <HandHeart className="w-4 h-4" />}
              Valider
            </button>

            {/* Ligne 2 : grands montants, placés explicitement en cols 3-4-5 */}
            {[50, 100, 200].map((amount, i) => (
              <button key={amount} type="button"
                onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                style={{ gridColumn: i + 3 }}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedAmount === amount && !customAmount
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          {/* ── MOBILE : tout empilé ───────────────────────────────────────────── */}
          <div className="lg:hidden space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Donateur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.donorName}
                onChange={e => handleDonorNameChange(e.target.value)}
                autoComplete="off"
                required
                className={`w-full px-3 py-2.5 border rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all ${form.donorId ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'}`}
                placeholder="Nom…"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Projet <span className="text-red-500">*</span></label>
              <select
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all bg-white"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                {[5, 10, 20, 50, 100, 200].map(amount => (
                  <button key={amount} type="button"
                    onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedAmount === amount && !customAmount
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                    min="1" step="1"
                    className="w-full pl-2 pr-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-emerald-400 transition-all font-medium"
                    placeholder="Montant €"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                </div>
                <button
                  type="submit"
                  disabled={loading || !resolvedMontant || !form.projectId || !form.donorName.trim()}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none whitespace-nowrap"
                >
                  {loading
                    ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    : <HandHeart className="w-4 h-4" />}
                  Valider
                </button>
              </div>
            </div>
          </div>

          {/* Équipe — admin uniquement */}
          {isAdmin && (
            <div className="lg:max-w-xs">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Équipe</label>
              <select
                value={form.leaderId}
                onChange={e => setForm(f => ({ ...f, leaderId: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all bg-white"
              >
                <option value="">— Ghost Team —</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.nom_equipe || l.nom_affichage}</option>)}
              </select>
            </div>
          )}

        </form>
      </div>

      {/* Dons récents + Classement côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Mes dons récents — leader uniquement */}
        {!isAdmin && myLeader && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Mes dons récents</h2>
              {recentDonations.length > 0 && (
                <button onClick={() => router.push('/historique')}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            {recentDonations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                <HandHeart className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucun don enregistré</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentDonations.slice(0, 6).map(d => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.donorNom}</p>
                      <p className="text-xs text-gray-400">{d.projectNom} · {new Date(d.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="font-bold text-emerald-600 text-sm">{fmt(d.montant)}</span>
                      <Badge status={d.statut} method={d.methode} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Classement donateurs */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${isAdmin ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Classement donateurs</h2>
              {donorRanking.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">{donorRanking.length}</span>
              )}
            </div>
            <button onClick={() => refreshRanking()} disabled={loadingRanking}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-40" title="Rafraîchir">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRanking ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {loadingRanking ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>Chargement…
              </div>
            ) : donorRanking.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                <HandHeart className="w-8 h-8 opacity-30" />
                <p className="text-sm">Aucun donateur pour l&apos;instant</p>
              </div>
            ) : donorRanking.map(({ nom, total, count }, i) => (
              <button key={i} type="button"
                onClick={() => router.push(`/historique?search=${encodeURIComponent(nom)}`)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left ${i === 0 ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'} transition-colors`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${medalColor(i)}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{nom}</p>
                  <p className="text-xs text-gray-400">{count} don{count > 1 ? 's' : ''}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 flex-shrink-0">{fmt(total)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

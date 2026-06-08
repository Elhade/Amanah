'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Users, Banknote, Share2, Copy, Check, Edit3, CheckCircle2, XCircle, RefreshCw, ArrowUpCircle, UserCheck, Lock, Receipt, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { useRouter } from 'next/navigation';
import { updateLeaderProfileAction, linkExistingDonorToLeaderAction, createAndLinkDonorToLeaderAction, createSetupIntentForLeaderAction, saveLeaderIbanAction } from '@/actions/leaders.actions';
import type { LinkedDonorInfo, SetupIntentData } from '@/actions/leaders.actions';
import { getCashReceivedForLeader, triggerCashRemittance } from '@/actions/donation.actions';
import type { CashReceivedRow } from '@/actions/donation.actions';
import { AccountCheckStep } from '@/components/home/donation/AccountCheckStep';
import type { AccountStatus } from '@/components/home/donation/AccountCheckStep';
import { SepaSetupStep } from '@/components/home/donation/SepaSetupStep';
import type { Leader, Donation } from '@/types';

export default function MonEspacePage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [myLeader, setMyLeader] = useState<Leader | null>(null);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cashPending, setCashPending] = useState<CashReceivedRow[]>([]);
  const [totalFrais, setTotalFrais] = useState(0);
  // Modal virement
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [personalAmount, setPersonalAmount] = useState('');
  const [personalProjectId, setPersonalProjectId] = useState('');
  const [projects, setProjects] = useState<{ id: string; nom: string }[]>([]);

  const [editNom, setEditNom] = useState('');
  const [editEquipe, setEditEquipe] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editResult, setEditResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Mot de passe
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [remittanceLoading, setRemittanceLoading] = useState(false);
  const [remittanceResult, setRemittanceResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Compte donateur
  const [linkedDonor, setLinkedDonor] = useState<LinkedDonorInfo | null>(null);
  const [donorSetupPhase, setDonorSetupPhase] = useState<'account' | 'iban' | null>(null);
  const [donorStatus, setDonorStatus] = useState<AccountStatus>('undecided');
  const [donorIdentifier, setDonorIdentifier] = useState('');
  const [donorExistingPin, setDonorExistingPin] = useState('');
  const [donorPseudo, setDonorPseudo] = useState('');
  const [donorNewPin, setDonorNewPin] = useState('');
  const [donorSubmitting, setDonorSubmitting] = useState(false);
  const [donorResult, setDonorResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [setupIntentData, setSetupIntentData] = useState<SetupIntentData | null>(null);
  const [ibanError, setIbanError] = useState('');

  useEffect(() => { fetchData(); }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    const leaderRes = await supabase.from('leaders').select('*').eq('user_id', profile.id).maybeSingle();
    const leader = leaderRes.data as Leader | null;
    setMyLeader(leader);
    if (leader) {
      setEditNom(leader.nom_affichage);
      setEditEquipe(leader.nom_equipe ?? '');
      setEditSlug(leader.slug);
    }
    setEditEmail(user?.email ?? '');
    setConfirmEmail('');

    if (!leader) { setLoading(false); return; }

    const projectsRes = await supabase.from('projects').select('id, nom').order('nom');
    const loadedProjects = (projectsRes.data ?? []) as { id: string; nom: string }[];
    setProjects(loadedProjects);
    if (loadedProjects.length > 0) setPersonalProjectId(p => p || loadedProjects[0].id);

    const [donationsRes, cashRes, donorRes, remittancesRes] = await Promise.all([
      supabase.from('donations').select('*, donors(nom), projects(nom), balance_transactions(fee, net, amount)').eq('leader_id', leader.id).order('created_at', { ascending: false }),
      getCashReceivedForLeader(leader.id),
      leader.donor_id
        ? supabase.from('donors').select('id, pseudo, stripe_payment_method_id').eq('id', leader.donor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('remittances').select('balance_transactions(fee)').eq('leader_id', leader.id),
    ]);

    if (donorRes.data) {
      const d = donorRes.data as { id: string; pseudo: string | null; stripe_payment_method_id: string | null };
      setLinkedDonor({ id: d.id, pseudo: d.pseudo, hasSEPA: !!d.stripe_payment_method_id });
    }

    const donations = (donationsRes.data || []) as unknown as Donation[];
    setMyDonations(donations);
    if (cashRes.ok) {
      setCashPending(cashRes.data);
      setSelectedIds(new Set(cashRes.data.map(d => d.id)));
    }

    const donFrais = donations.reduce((s, d) => s + (d.balance_transactions?.fee ?? 0), 0);
    const remFrais = ((remittancesRes.data ?? []) as unknown as { balance_transactions: { fee: number } | null }[])
      .reduce((s, r) => s + (r.balance_transactions?.fee ?? 0), 0);
    setTotalFrais(donFrais + remFrais);

    setLoading(false);
  };

  const openVirementModal = () => {
    setSelectedIds(new Set(cashPending.map(d => d.id)));
    setPersonalAmount('');
    setRemittanceResult(null);
    setShowModal(true);
  };

  const handleConfirmVirement = async () => {
    if (!myLeader) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setRemittanceLoading(true);
    setRemittanceResult(null);
    const cashTotal = cashPending.filter(d => selectedIds.has(d.id)).reduce((s, d) => s + d.montant, 0);
    const perso = parseFloat(personalAmount) || 0;
    const result = await triggerCashRemittance(
      myLeader.id,
      ids,
      perso > 0 && linkedDonor?.id && personalProjectId
        ? { personalAmount: perso, personalDonorId: linkedDonor.id, personalProjectId }
        : undefined
    );
    if (result.ok) {
      const total = cashTotal + perso;
      setRemittanceResult({ ok: true, message: `Virement de ${fmt(total)} initié — les dons seront soldés à confirmation Stripe.` });
      setShowModal(false);
      await fetchData();
    } else {
      setRemittanceResult({ ok: false, message: result.error ?? 'Erreur inconnue' });
    }
    setRemittanceLoading(false);
  };

  const handleAccountResolved = async (donor: LinkedDonorInfo) => {
    setLinkedDonor(donor);
    setMyLeader(l => l ? { ...l, donor_id: donor.id } : l);
    if (donor.hasSEPA) {
      setDonorSetupPhase(null);
      setDonorResult({ ok: true, message: 'Compte donateur configuré.' });
      return;
    }
    setDonorSubmitting(true);
    const intentResult = await createSetupIntentForLeaderAction(myLeader!.id, user?.email ?? '');
    setDonorSubmitting(false);
    if (intentResult.ok) {
      setSetupIntentData(intentResult.data);
      setIbanError('');
      setDonorSetupPhase('iban');
    } else {
      setDonorSetupPhase(null);
      setDonorResult({ ok: true, message: 'Compte créé — configurez votre IBAN plus tard.' });
      setIbanError(intentResult.error);
    }
  };

  const handleLinkExistingDonor = async () => {
    if (!myLeader) return;
    setDonorSubmitting(true);
    setDonorResult(null);
    const result = await linkExistingDonorToLeaderAction(myLeader.id, donorIdentifier, donorExistingPin);
    if (result.ok) {
      await handleAccountResolved(result.data);
    } else {
      setDonorResult({ ok: false, message: result.error });
      setDonorSubmitting(false);
    }
  };

  const handleCreateDonor = async () => {
    if (!myLeader) return;
    setDonorSubmitting(true);
    setDonorResult(null);
    const result = await createAndLinkDonorToLeaderAction(myLeader.id, donorPseudo, donorNewPin);
    if (result.ok) {
      await handleAccountResolved(result.data);
    } else {
      setDonorResult({ ok: false, message: result.error });
      setDonorSubmitting(false);
    }
  };

  const handleIbanSuccess = async (paymentMethodId: string) => {
    if (!setupIntentData) return;
    const result = await saveLeaderIbanAction(setupIntentData.donorId, paymentMethodId, setupIntentData.customerId);
    if (result.ok) {
      setLinkedDonor(d => d ? { ...d, hasSEPA: true } : d);
      setDonorSetupPhase(null);
      setSetupIntentData(null);
      setDonorResult({ ok: true, message: 'IBAN configuré — virements SEPA activés.' });
    } else {
      setIbanError(result.error);
    }
  };

  const handleSaveProfile = async () => {
    if (!myLeader) return;
    setEditLoading(true);
    setEditResult(null);

    // Mise à jour email si modifié
    const currentEmail = user?.email ?? '';
    const emailChanged = editEmail.trim() && editEmail.trim() !== currentEmail;
    if (emailChanged) {
      if (editEmail.trim() !== confirmEmail.trim()) {
        setEditResult({ ok: false, message: 'Les adresses e-mail ne correspondent pas.' });
        setEditLoading(false);
        return;
      }
      const { error: emailErr } = await supabase.auth.updateUser({ email: editEmail.trim() });
      if (emailErr) {
        setEditResult({ ok: false, message: `Erreur email : ${emailErr.message}` });
        setEditLoading(false);
        return;
      }
    }

    const result = await updateLeaderProfileAction(myLeader.id, { nom_affichage: editNom, nom_equipe: editEquipe || null, slug: editSlug });
    if (result.ok) {
      setEditResult({ ok: true, message: emailChanged ? 'Profil mis à jour. Un lien de confirmation a été envoyé à votre nouvelle adresse.' : 'Profil mis à jour.' });
      setMyLeader(l => l ? { ...l, nom_affichage: editNom, nom_equipe: editEquipe || null, slug: editSlug } : l);
      if (emailChanged) setConfirmEmail('');
    } else {
      setEditResult({ ok: false, message: result.error });
    }
    setEditLoading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordResult({ ok: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordResult({ ok: false, message: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordResult(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordResult({ ok: false, message: error.message });
    } else {
      setPasswordResult({ ok: true, message: 'Mot de passe modifié avec succès.' });
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordOpen(false);
    }
    setPasswordLoading(false);
  };

  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`;
  const cashPendingTotal = cashPending.reduce((s, d) => s + d.montant, 0);
  const myTotal = myDonations.filter(d => ['paid', 'cash_remitted', 'cash_received'].includes(d.statut)).reduce((s, d) => s + d.montant, 0);
  const uniqueDonors = new Set(myDonations.map(d => d.donor_id).filter(Boolean)).size;
  const donationSlug = editSlug || myLeader?.slug || '';
  const donationLink = myLeader ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${donationSlug}` : '';

  const handleCopy = () => {
    if (donationLink) {
      navigator.clipboard.writeText(donationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startDonorSetup = () => {
    setDonorStatus('new');
    setDonorResult(null);
    setDonorSetupPhase('account');
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all';

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
        <h1 className="text-2xl font-bold text-gray-900">Mon Espace</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue, {myLeader?.nom_affichage || profile?.nom}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">

        {/* Total collecté — col-span-2, layout horizontal avec brut / frais / net */}
        <div className="col-span-2 bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-4 h-full">
            <div className="bg-emerald-50 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total collecté</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 whitespace-nowrap">{fmt(myTotal - totalFrais)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Net après frais</p>
            </div>
            <div className="border-l border-gray-100 pl-4 flex-shrink-0 space-y-1.5">
              <div className="flex items-center justify-between gap-5">
                <span className="text-xs text-gray-400">Brut</span>
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{fmt(myTotal)}</span>
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

        <StatCard title="Frais Stripe" value={fmt(totalFrais)} icon={Receipt} iconColor="text-rose-600" iconBg="bg-rose-50" valueColor="text-rose-600" subtitle="Coût des transactions" />
        {/* Espèces en attente — carte custom pour éviter la troncature du titre */}
        <div className="rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 leading-snug">Espèces<br />en attente</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 whitespace-nowrap ${cashPendingTotal > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                {fmt(cashPendingTotal)}
              </p>
              <p className={`text-xs mt-0.5 ${cashPendingTotal > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {cashPending.length > 0 ? `${cashPending.length} don${cashPending.length > 1 ? 's' : ''}` : 'Aucun don'}
              </p>
            </div>
            <div className={`p-2 sm:p-3 rounded-xl flex-shrink-0 ml-2 ${cashPendingTotal > 0 ? 'bg-amber-100' : 'bg-gray-50'}`}>
              <Banknote className={`w-5 h-5 sm:w-6 sm:h-6 ${cashPendingTotal > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>
        <StatCard title="Donateurs" value={uniqueDonors} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />

      </div>

      {/* Bandeau virement espèces */}
      {myLeader && cashPending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Banknote className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {cashPending.length} don{cashPending.length > 1 ? 's' : ''} en espèces à virer
              </p>
              <p className="text-amber-700 text-xs">
                Total : {fmt(cashPendingTotal)} — 1 seul prélèvement SEPA
              </p>
            </div>
          </div>
          <button
            onClick={openVirementModal}
            disabled={remittanceLoading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-all"
          >
            {remittanceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
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

      {/* Grille principale : profil à gauche, compte donateur + lien à droite */}
      {/* ── Modal virement ── */}
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
                {linkedDonor?.hasSEPA && (
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

      {myLeader && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT : Mon profil */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-5">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Mon profil</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom d&apos;affichage</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={e => { setEditNom(e.target.value); setEditResult(null); }}
                  className={inputCls}
                  placeholder="Votre nom affiché aux donateurs"
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse e-mail</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => { setEditEmail(e.target.value); setConfirmEmail(''); setEditResult(null); }}
                    className={inputCls}
                    placeholder="votre@email.com"
                    autoComplete="email"
                  />
                </div>
                {editEmail.trim() && editEmail.trim() !== (user?.email ?? '') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer l&apos;adresse e-mail</label>
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={e => { setConfirmEmail(e.target.value); setEditResult(null); }}
                      className={`${inputCls} ${confirmEmail && confirmEmail !== editEmail ? 'border-red-300 focus:border-red-400 focus:ring-red-400/40' : ''}`}
                      placeholder="votre@email.com"
                      autoComplete="off"
                    />
                    {confirmEmail && confirmEmail !== editEmail && (
                      <p className="text-xs text-red-500 mt-1">Les adresses ne correspondent pas.</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom d&apos;équipe <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <input
                  type="text"
                  value={editEquipe}
                  onChange={e => { setEditEquipe(e.target.value); setEditResult(null); }}
                  className={inputCls}
                  placeholder="Ex : Équipe Baraka, Team Lumière…"
                />
                <p className="text-xs text-gray-400 mt-1">Affiché à la place de votre nom dans l&apos;historique et le dashboard.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug (lien de collecte)</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400/40 focus-within:border-emerald-400 transition-all">
                  <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">/?ref=</span>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={e => { setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setEditResult(null); }}
                    className="flex-1 px-3 py-2.5 text-sm text-gray-800 focus:outline-none bg-white"
                    placeholder="mon-slug"
                  />
                </div>
              </div>

              {editResult && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${editResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                  {editResult.ok
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  {editResult.message}
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={editLoading || !editNom.trim() || !editSlug.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {editLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>

              {/* Changer le mot de passe */}
              <div className="border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setChangePasswordOpen(o => !o); setPasswordResult(null); setNewPassword(''); setConfirmPassword(''); }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {changePasswordOpen ? 'Annuler' : 'Changer mon mot de passe'}
                </button>

                {changePasswordOpen && (
                  <div className="mt-3 space-y-3">
                    <input
                      type="password"
                      placeholder="Nouveau mot de passe (min. 6 caractères)"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setPasswordResult(null); }}
                      className={inputCls}
                      autoComplete="new-password"
                    />
                    <input
                      type="password"
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setPasswordResult(null); }}
                      className={inputCls}
                      autoComplete="new-password"
                    />
                    {passwordResult && (
                      <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${passwordResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                        {passwordResult.ok
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        {passwordResult.message}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={passwordLoading || !newPassword || !confirmPassword}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      {passwordLoading ? 'Modification...' : 'Modifier le mot de passe'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT : Compte donateur + Lien de collecte empilés */}
          <div className="flex flex-col gap-6">

            {/* Mon compte donateur */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-gray-900">Mon compte donateur</h2>
              </div>

              {!linkedDonor && !donorSetupPhase && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <XCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">IBAN non configuré.</p>
                      <p className="text-xs text-amber-700 mt-0.5">Nécessaire pour virer les espèces collectées.</p>
                    </div>
                  </div>
                  <button
                    onClick={startDonorSetup}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all"
                  >
                    Configurer mon compte donateur
                  </button>
                </div>
              )}

              {donorSetupPhase === 'account' && (
                <div className="space-y-4">
                  <AccountCheckStep
                    accountStatus={donorStatus}
                    onSelectStatus={setDonorStatus}
                    existingIdentifier={donorIdentifier}
                    existingPin={donorExistingPin}
                    onIdentifierChange={setDonorIdentifier}
                    onExistingPinChange={setDonorExistingPin}
                    onValidateExisting={handleLinkExistingDonor}
                    pseudo={donorPseudo}
                    pin={donorNewPin}
                    onPseudoChange={setDonorPseudo}
                    onPinChange={setDonorNewPin}
                    onSubmitNew={handleCreateDonor}
                    submitting={donorSubmitting}
                    submitLabel="Continuer"
                    hideSelection
                    hideHeader
                  />
                  <button
                    type="button"
                    onClick={() => { setDonorSetupPhase(null); setDonorResult(null); }}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {donorSetupPhase === 'iban' && setupIntentData && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Renseignez votre IBAN pour activer les virements. Aucun débit ne sera effectué maintenant.
                  </p>
                  {ibanError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-red-600 text-sm">{ibanError}</p>
                    </div>
                  )}
                  <SepaSetupStep
                    donorId={setupIntentData.donorId}
                    clientSecret={setupIntentData.clientSecret}
                    donorName={setupIntentData.donorName}
                    donorEmail={setupIntentData.donorEmail || user?.email || ''}
                    onSuccess={handleIbanSuccess}
                  />
                  <button
                    type="button"
                    onClick={() => { setDonorSetupPhase(null); setSetupIntentData(null); setDonorResult({ ok: true, message: 'Compte créé — configurez votre IBAN plus tard via ce menu.' }); }}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Configurer l&apos;IBAN plus tard
                  </button>
                </div>
              )}

              {linkedDonor && !donorSetupPhase && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">
                        {linkedDonor.pseudo ? `@${linkedDonor.pseudo}` : 'Compte lié'}
                      </p>
                      {linkedDonor.hasSEPA
                        ? <p className="text-xs text-emerald-700">IBAN configuré — virements actifs</p>
                        : <p className="text-xs text-amber-700">IBAN non configuré</p>
                      }
                    </div>
                  </div>
                  {!linkedDonor.hasSEPA && (
                    <button
                      onClick={async () => {
                        const intentResult = await createSetupIntentForLeaderAction(myLeader!.id, user?.email ?? '');
                        if (intentResult.ok) { setSetupIntentData(intentResult.data); setIbanError(''); setDonorSetupPhase('iban'); }
                        else setIbanError(intentResult.error);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      Configurer mon IBAN
                    </button>
                  )}
                </div>
              )}

              {donorResult && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm mt-3 ${donorResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                  {donorResult.ok
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  {donorResult.message}
                </div>
              )}
            </div>

            {/* Mon lien de collecte */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-emerald-200 text-xs font-medium mb-1">Mon lien de collecte</p>
              <p className="text-white/50 text-xs truncate">
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </p>
              <p className="text-white font-mono font-semibold text-sm mb-4">
                /?ref=<span className="text-emerald-200">{donationSlug}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all flex-1 justify-center">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <a
                  href={`https://wa.me/?text=Soutenez%20notre%20collecte%20%3A%20${encodeURIComponent(donationLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </a>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

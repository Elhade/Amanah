'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle, AlertCircle, Lock, CreditCard, Banknote,
  Gift, RefreshCw, User, Mail, Phone, Hash,
  CalendarDays, Landmark, HandHeart,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DonationMethod, Leader } from '@/types';
import type { ProjectWithStats } from '@/types/project';

declare global {
  interface Window {
    Stripe?: (key: string) => StripeInstance;
  }
}

interface StripeInstance {
  elements: (options: object) => StripeElements;
  confirmPayment: (options: object) => Promise<{ error?: { message: string } }>;
}

interface StripeElements {
  create: (type: string, options?: object) => StripeElement;
  getElement: (type: string) => StripeElement | null;
  submit: () => Promise<{ error?: { message: string } }>;
}

interface StripeElement {
  mount: (el: HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: () => void) => void;
}

type PaymentMethod = 'card' | 'cash';
type DonationType = 'ponctuel' | 'mensuel';
type Step = 'form' | 'stripe' | 'virement' | 'success';

const PRESET_AMOUNTS = [5, 10, 20, 50, 100, 200];

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

interface Props {
  project: ProjectWithStats;
  leader?: Leader | null;
}

export function DonationForm({ project, leader = null }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donationType, setDonationType] = useState<DonationType>('ponctuel');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorPseudo, setDonorPseudo] = useState('');
  const [donorIban, setDonorIban] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [clientSecret, setClientSecret] = useState('');
  const [stripeReady, setStripeReady] = useState(false);
  const stripeRef = useRef<StripeInstance | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const cardMountedRef = useRef(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const finalAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : 0);

  const initStripe = () => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk || !window.Stripe) return;
    if (!stripeRef.current) stripeRef.current = window.Stripe(pk);
    setStripeReady(true);
  };

  useEffect(() => {
    if (step !== 'stripe') return;
    if (window.Stripe) { initStripe(); return; }
    const interval = setInterval(() => {
      if (window.Stripe) { clearInterval(interval); initStripe(); }
    }, 100);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== 'stripe' || !stripeReady || !clientSecret || !cardContainerRef.current) return;
    if (cardMountedRef.current) return;
    const elements = stripeRef.current!.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#059669', colorBackground: '#ffffff', colorText: '#1f2937',
          colorDanger: '#ef4444', fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          borderRadius: '12px', spacingUnit: '4px',
        },
      },
    });
    elementsRef.current = elements;
    const paymentElement = elements.create('payment');
    paymentElement.mount(cardContainerRef.current);
    cardMountedRef.current = true;
  }, [clientSecret, stripeReady, step]);

  const validate = () => {
    if (!finalAmount || finalAmount < 0.5) { setError('Le montant minimum est de 0,50 €.'); return false; }
    if (!donorEmail.trim()) { setError("L'adresse e-mail est obligatoire."); return false; }
    if (!/\S+@\S+\.\S+/.test(donorEmail)) { setError("L'adresse e-mail est invalide."); return false; }
    if (donationType === 'mensuel') {
      if (!donorPseudo.trim()) { setError('Le pseudo est obligatoire pour un don mensuel.'); return false; }
      const rawIban = donorIban.replace(/\s/g, '').toUpperCase();
      if (!rawIban) { setError("L'IBAN est obligatoire pour un prélèvement mensuel."); return false; }
      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(rawIban)) {
        setError("L'IBAN saisi est invalide. Vérifiez le format (ex : FR76...).");
        return false;
      }
    }
    return true;
  };

  const createPaymentIntent = async () => {
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(finalAmount * 100),
        currency: 'eur',
        metadata: {
          donor_name: donorName.trim() || 'Anonyme',
          donor_email: donorEmail.trim(),
          leader_id: leader?.id ?? '',
          project_id: project.id,
        },
      }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.clientSecret as string;
  };

  const insertDonorAndDonation = async (
    extra: Record<string, string | null | undefined>,
    methode: DonationMethod,
  ) => {
    const { data: donor, error: donorErr } = await supabase
      .from('donors')
      .insert({
        nom: donorName.trim() || 'Anonyme',
        email: donorEmail.trim() || null,
        telephone: donorPhone.trim() || null,
        ...extra,
      })
      .select()
      .single();

    if (donorErr || !donor) {
      if ((donorErr as { code?: string } | null)?.code === '23505') {
        throw new Error('Ce pseudo est déjà utilisé. Veuillez en choisir un autre.');
      }
      throw new Error('Une erreur est survenue lors de la création du profil.');
    }

    const { error: donErr } = await supabase.from('donations').insert({
      donor_id: (donor as { id: string }).id,
      leader_id: leader?.id ?? null,
      project_id: project.id,
      montant: finalAmount,
      methode,
      statut: 'pending',
    });

    if (donErr) throw new Error("Une erreur est survenue lors de l'enregistrement du don.");
  };

  const handleProceedToCard = async () => {
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      cardMountedRef.current = false;
      elementsRef.current = null;
      const secret = await createPaymentIntent();
      setClientSecret(secret);
      setStep('stripe');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;
    setError('');
    setSubmitting(true);
    const { error: submitError } = await elementsRef.current.submit();
    if (submitError) { setError(submitError.message || 'Erreur de validation.'); setSubmitting(false); return; }
    const { error: confirmError } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (confirmError) { setError(confirmError.message || 'Le paiement a échoué.'); setSubmitting(false); }
    else setStep('success');
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await insertDonorAndDonation({}, 'cash');
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVirementSubmit = async () => {
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const rawIban = donorIban.replace(/\s/g, '').toUpperCase();
      await insertDonorAndDonation({ pseudo: donorPseudo.trim(), iban: rawIban }, 'virement');
      setStep('virement');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const maskedIban = donorIban
    ? `•••• •••• •••• •••• ••••${donorIban.replace(/\s/g, '').slice(-4)}`
    : '';

  if (step === 'success') {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">JazakAllah Khayr !</h3>
        <p className="text-gray-500 mb-1 text-sm">
          {paymentMethod === 'card' ? 'Votre paiement a été confirmé.' : 'Votre don a été enregistré.'}
        </p>
        {leader && (
          <p className="text-sm text-emerald-600 font-medium">Collecté par {leader.nom_affichage}</p>
        )}
        <div className="mt-4 bg-emerald-50 rounded-2xl p-4">
          <p className="text-emerald-800 font-semibold text-lg">{finalAmount.toLocaleString('fr-FR')} €</p>
          <p className="text-emerald-600 text-sm">{project.nom}</p>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Puisse Allah accepter votre sadaqa et vous récompenser au centuple.
        </p>
      </div>
    );
  }

  if (step === 'virement') {
    return (
      <div className="p-6">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Mandat SEPA enregistré ✓</h3>
          <p className="text-gray-500 text-sm mt-1">
            Votre prélèvement mensuel a bien été pris en compte.
          </p>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-4 space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Pseudo</span>
            <span className="font-mono font-bold text-emerald-700">{donorPseudo}</span>
          </div>
          <div className="h-px bg-emerald-100" />
          <div className="flex justify-between items-center">
            <span className="text-gray-500">IBAN enregistré</span>
            <span className="font-mono text-gray-700 text-xs">{maskedIban}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Montant mensuel</span>
            <span className="font-bold text-emerald-700">{finalAmount.toLocaleString('fr-FR')} €/mois</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Projet</span>
            <span className="font-semibold text-gray-800 text-right max-w-[55%]">{project.nom}</span>
          </div>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            Nous vous contacterons à l&apos;adresse <strong>{donorEmail}</strong> pour finaliser
            votre mandat de prélèvement SEPA et confirmer votre premier prélèvement.
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

  return (
    <div className="p-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-6">
          {/* Montant */}
          <div>
            <SectionHeader icon={<span className="text-sm font-bold">€</span>} label="Montant du don" />
            <div className="grid grid-cols-3 gap-2 mb-3">
              {PRESET_AMOUNTS.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.03] active:scale-[0.97] ${
                    selectedAmount === amount
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {amount} €
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                min="1"
                step="0.01"
                className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-base font-medium"
                placeholder="Autre montant..."
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            </div>
          </div>

          {/* Type de don */}
          <div>
            <SectionHeader icon={<CalendarDays className="w-4 h-4" />} label="Type de don" />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDonationType('ponctuel')}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
                  donationType === 'ponctuel'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Gift className="w-4 h-4" />
                Ponctuel
              </button>
              <button
                type="button"
                onClick={() => setDonationType('mensuel')}
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
                  donationType === 'mensuel'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Mensuel
              </button>
            </div>
          </div>

          {/* Vos informations */}
          <div>
            <SectionHeader icon={<User className="w-4 h-4" />} label="Vos informations" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Votre nom (optionnel)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      value={donorName}
                      onChange={e => setDonorName(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                      placeholder="Rester anonyme"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Adresse e-mail *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={e => setDonorEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                      placeholder="exemple@email.com"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Le reçu vous sera envoyé par e-mail.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Téléphone (optionnel)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  <input
                    type="tel"
                    value={donorPhone}
                    onChange={e => setDonorPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              {donationType === 'mensuel' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pseudo *</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      <input
                        type="text"
                        value={donorPseudo}
                        onChange={e => setDonorPseudo(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                        placeholder="votre_pseudo"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Identifiant unique et permanent — utilisé comme référence de prélèvement.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">IBAN *</label>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      <input
                        type="text"
                        value={donorIban}
                        onChange={e => setDonorIban(e.target.value.toUpperCase())}
                        className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm font-mono tracking-wide"
                        placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Votre IBAN est nécessaire pour mettre en place le prélèvement mensuel.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mode de paiement (ponctuel uniquement) */}
          {donationType === 'ponctuel' && (
            <div>
              <SectionHeader icon={<CreditCard className="w-4 h-4" />} label="Mode de paiement" />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${paymentMethod === 'card' ? 'text-emerald-800' : 'text-gray-600'}`}>Carte</span>
                  <span className={`text-xs ${paymentMethod === 'card' ? 'text-emerald-600' : 'text-gray-400'}`}>Paiement sécurisé</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}
                >
                  <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${paymentMethod === 'cash' ? 'text-emerald-800' : 'text-gray-600'}`}>Espèces</span>
                  <span className={`text-xs ${paymentMethod === 'cash' ? 'text-emerald-600' : 'text-gray-400'}`}>Remise en main</span>
                </button>
              </div>
            </div>
          )}

          {/* Bouton de soumission */}
          {donationType === 'ponctuel' ? (
            paymentMethod === 'card' ? (
              <button
                type="button"
                onClick={handleProceedToCard}
                disabled={submitting || (!selectedAmount && !customAmount)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Spinner />Préparation...</>
                  : <><Lock className="w-4 h-4" />{finalAmount > 0 ? `Payer ${finalAmount.toLocaleString('fr-FR')} € par carte` : 'Payer par carte'}</>
                }
              </button>
            ) : (
              <form onSubmit={handleCashSubmit}>
                <button
                  type="submit"
                  disabled={submitting || (!selectedAmount && !customAmount)}
                  className="w-full py-4 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-amber-400/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><Spinner />Traitement...</>
                    : finalAmount > 0 ? `Donner ${finalAmount.toLocaleString('fr-FR')} € en espèces` : 'Donner'
                  }
                </button>
              </form>
            )
          ) : (
            <button
              type="button"
              onClick={handleVirementSubmit}
              disabled={submitting || (!selectedAmount && !customAmount) || !donorPseudo.trim() || !donorIban.trim()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Spinner />Enregistrement...</>
                : <><RefreshCw className="w-4 h-4" />{finalAmount > 0 ? `Valider ${finalAmount.toLocaleString('fr-FR')} €/mois` : 'Valider mon don mensuel'}</>
              }
            </button>
          )}

          <p className="text-center text-xs text-gray-400">
            Votre don contribue directement aux projets sélectionnés
          </p>
        </div>
      )}

      {step === 'stripe' && (
        <form onSubmit={handleStripePayment} className="space-y-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-semibold text-gray-700">Paiement sécurisé</p>
              <p className="text-xs text-gray-400">Crypté par Stripe</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">{finalAmount.toLocaleString('fr-FR')} €</span>
            </div>
          </div>
          <div ref={cardContainerRef} className="min-h-[120px]" />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Spinner />Traitement...</>
              : <><Lock className="w-4 h-4" />Confirmer le don de {finalAmount.toLocaleString('fr-FR')} €</>
            }
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setClientSecret('');
              cardMountedRef.current = false;
              elementsRef.current = null;
            }}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Modifier le montant
          </button>
        </form>
      )}
    </div>
  );
}

'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { HandHeart, CheckCircle, AlertCircle, ChevronRight, CreditCard, Banknote, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Leader, Project } from '@/lib/types';

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

const PRESET_AMOUNTS = [5, 10, 20, 50, 100, 200];

function DonPageContent() {
  const searchParams = useSearchParams();
  const leaderSlug = searchParams?.get('ref') ?? null;

  const [leader, setLeader] = useState<Leader | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [clientSecret, setClientSecret] = useState('');
  const [stripeReady, setStripeReady] = useState(false);
  const stripeRef = useRef<StripeInstance | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const cardMountedRef = useRef(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const finalAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : 0);

  useEffect(() => { fetchData(); }, [leaderSlug]);

  const fetchData = async () => {
    const [projectsRes, leaderRes] = await Promise.all([
      supabase.from('projects').select('*'),
      leaderSlug
        ? supabase.from('leaders').select('*').eq('slug', leaderSlug).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const projs = (projectsRes.data || []) as Project[];
    setProjects(projs);
    if (projs.length > 0) setSelectedProject(projs[0].id);
    setLeader((leaderRes as { data: Leader | null }).data);
    setLoading(false);
  };

  const initStripe = () => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk || !window.Stripe) return;
    if (!stripeRef.current) stripeRef.current = window.Stripe(pk);
    setStripeReady(true);
  };

  useEffect(() => {
    if (paymentMethod !== 'card') return;
    if (window.Stripe) { initStripe(); return; }
    const interval = setInterval(() => {
      if (window.Stripe) { clearInterval(interval); initStripe(); }
    }, 100);
    return () => clearInterval(interval);
  }, [paymentMethod]);

  useEffect(() => {
    if (paymentMethod !== 'card' || !stripeReady || !clientSecret || !cardContainerRef.current) return;
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
  }, [clientSecret, stripeReady, paymentMethod]);

  const createPaymentIntent = async (amount: number) => {
    const res = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'eur',
        metadata: { donor_name: donorName.trim() || 'Anonyme', leader_id: leader?.id || '', project_id: selectedProject || '' },
      }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.clientSecret as string;
  };

  const handleProceedToPayment = async () => {
    setError('');
    if (!finalAmount || finalAmount < 0.5) { setError('Le montant minimum est de 0.50 €.'); return; }
    if (!selectedProject) { setError('Veuillez sélectionner un projet.'); return; }
    setSubmitting(true);
    try {
      cardMountedRef.current = false;
      elementsRef.current = null;
      setClientSecret(await createPaymentIntent(finalAmount));
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
      elements: elementsRef.current, clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (confirmError) { setError(confirmError.message || 'Le paiement a échoué.'); setSubmitting(false); }
    else setSuccess(true);
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!finalAmount || finalAmount <= 0) { setError('Veuillez saisir un montant valide.'); return; }
    setSubmitting(true);
    const { data: donor, error: donorErr } = await supabase.from('donors').insert({ nom: donorName.trim() || 'Anonyme' }).select().single();
    if (donorErr) { setError('Une erreur est survenue.'); setSubmitting(false); return; }
    const { error: donErr } = await supabase.from('donations').insert({
      donor_id: donor.id, leader_id: leader?.id || null, project_id: selectedProject || null,
      montant: finalAmount, methode: 'cash', statut: 'pending',
    });
    if (donErr) setError("Une erreur est survenue lors de l'enregistrement.");
    else setSuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">JazakAllah Khayr !</h2>
          <p className="text-gray-500 mb-1">{paymentMethod === 'card' ? 'Votre paiement a été confirmé.' : 'Votre don a été enregistré.'}</p>
          {leader && <p className="text-sm text-emerald-600 font-medium">Collecté par {leader.nom_affichage}</p>}
          <div className="mt-6 bg-emerald-50 rounded-2xl p-4">
            <p className="text-emerald-800 font-semibold text-lg">{finalAmount.toLocaleString('fr-FR')} €</p>
            <p className="text-emerald-600 text-sm">{projects.find(p => p.id === selectedProject)?.nom}</p>
          </div>
          <p className="text-xs text-gray-400 mt-6">Puisse Allah accepter votre sadaqa et vous récompenser au centuple.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-400 rounded-2xl shadow-lg shadow-amber-400/30 mb-4">
            <HandHeart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {leader ? `Don via ${leader.nom_affichage}` : 'Faire un don'}
          </h1>
          <p className="text-emerald-300 text-sm mt-1">JamaaAmanah — La confiance au cœur des dons</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!clientSecret ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Choisissez un projet</label>
                <div className="space-y-2">
                  {projects.map(p => (
                    <button key={p.id} type="button" onClick={() => setSelectedProject(p.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${selectedProject === p.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedProject === p.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                        {selectedProject === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm ${selectedProject === p.id ? 'text-emerald-800' : 'text-gray-800'}`}>{p.nom}</p>
                        {p.description && <p className="text-xs text-gray-500 truncate">{p.description}</p>}
                      </div>
                      {selectedProject === p.id && <ChevronRight className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Montant du don</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {PRESET_AMOUNTS.map(amount => (
                    <button key={amount} type="button" onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                      className={`py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.03] active:scale-[0.97] ${selectedAmount === amount ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {amount} €
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input type="number" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }} min="1" step="0.01"
                    className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-emerald-400 transition-all text-base font-medium"
                    placeholder="Autre montant..." />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Votre nom (optionnel)</label>
                <input type="text" value={donorName} onChange={e => setDonorName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-emerald-400 transition-all"
                  placeholder="Rester anonyme" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Mode de paiement</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}>
                    <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${paymentMethod === 'card' ? 'text-emerald-800' : 'text-gray-600'}`}>Carte</span>
                    <span className={`text-xs ${paymentMethod === 'card' ? 'text-emerald-600' : 'text-gray-400'}`}>Paiement sécurisé</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}>
                    <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-semibold ${paymentMethod === 'cash' ? 'text-emerald-800' : 'text-gray-600'}`}>Espèces</span>
                    <span className={`text-xs ${paymentMethod === 'cash' ? 'text-emerald-600' : 'text-gray-400'}`}>Remise en main</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'card' ? (
                <button type="button" onClick={handleProceedToPayment}
                  disabled={submitting || (!selectedAmount && !customAmount) || !selectedProject}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2">
                  {submitting ? (
                    <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Préparation...</>
                  ) : (<><Lock className="w-4 h-4" />{finalAmount > 0 ? `Payer ${finalAmount.toLocaleString('fr-FR')} € par carte` : 'Payer par carte'}</>)}
                </button>
              ) : (
                <form onSubmit={handleCashSubmit}>
                  <button type="submit" disabled={submitting || (!selectedAmount && !customAmount) || !selectedProject}
                    className="w-full py-4 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-amber-400/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base">
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Traitement...</span>
                    ) : finalAmount > 0 ? `Donner ${finalAmount.toLocaleString('fr-FR')} € en espèces` : 'Donner'}
                  </button>
                </form>
              )}
              <p className="text-center text-xs text-gray-400">Votre don contribue directement aux projets sélectionnés</p>
            </div>
          ) : (
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
              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2">
                {submitting ? (
                  <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Traitement...</>
                ) : (<><Lock className="w-4 h-4" />Confirmer le don de {finalAmount.toLocaleString('fr-FR')} €</>)}
              </button>
              <button type="button" onClick={() => { setClientSecret(''); cardMountedRef.current = false; elementsRef.current = null; }}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Modifier le montant
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-emerald-400/50 text-xs mt-6">&copy; {new Date().getFullYear()} JamaaAmanah</p>
      </div>
    </div>
  );
}

export default function DonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DonPageContent />
    </Suspense>
  );
}

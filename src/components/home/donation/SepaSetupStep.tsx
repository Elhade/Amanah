'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { getStripePromise } from '@/lib/stripe/client';
import { initSepaForNewDonor } from '@/actions/donation.actions';
import { Spinner } from './shared';

interface BaseProps {
  amount?: number;
  onSuccess: (paymentMethodId: string, newDonorId?: string, newDonorName?: string) => void;
}

interface ExistingAccountProps extends BaseProps {
  donorId: string;
  clientSecret: string;
  donorName: string;
  donorEmail: string;
  pendingPseudo?: never;
  pendingPin?: never;
}

interface NewAccountProps extends BaseProps {
  pendingPseudo: string;
  pendingPin: string;
  donorId?: never;
  clientSecret?: never;
}

type Props = ExistingAccountProps | NewAccountProps;

const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#059669',
    colorBackground: '#ffffff',
    colorText: '#1f2937',
    colorDanger: '#ef4444',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
};

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

const readonlyClass =
  'w-full px-4 py-3 border border-gray-100 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed';

export function SepaSetupStep({ amount = 0, onSuccess, ...props }: Props) {
  const isNew = 'pendingPseudo' in props && !!props.pendingPseudo;
  const existing = isNew ? null : (props as ExistingAccountProps);

  // Infos personnelles
  const [localName, setLocalName] = useState(existing?.donorName ?? '');
  const [localEmail, setLocalEmail] = useState(existing?.donorEmail ?? '');
  const [localPhone, setLocalPhone] = useState('');

  // Adresse (requise par Stripe pour le mandat SEPA)
  const [localLine1, setLocalLine1] = useState('');
  const [localPostalCode, setLocalPostalCode] = useState('');
  const [localCity, setLocalCity] = useState('');

  const [resolvedDonorId, setResolvedDonorId] = useState(existing?.donorId ?? '');
  const [clientSecret, setClientSecret] = useState(existing?.clientSecret ?? '');

  const [infoStep, setInfoStep] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientSecret || infoStep) return;

    let paymentElement: StripePaymentElement | null = null;

    getStripePromise().then((stripe) => {
      if (!stripe || !containerRef.current) return;
      stripeRef.current = stripe;

      const elements = stripe.elements({ clientSecret, appearance: STRIPE_APPEARANCE });
      elementsRef.current = elements;

      paymentElement = elements.create('payment', {
        fields: { billingDetails: 'never' },
        wallets: { link: 'never' },
      });
      paymentElement.on('ready', () => setReady(true));
      paymentElement.mount(containerRef.current);
    });

    return () => {
      paymentElement?.destroy();
      setReady(false);
    };
  }, [clientSecret, infoStep]);

  // ── Étape 1 : collecte des coordonnées ───────────────────────────────────────

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) { setError('Le nom complet est obligatoire.'); return; }
    if (!localEmail.trim() || !/\S+@\S+\.\S+/.test(localEmail)) {
      setError("L'adresse e-mail est invalide.");
      return;
    }
    if (!localLine1.trim()) { setError("L'adresse est obligatoire."); return; }
    if (!localPostalCode.trim()) { setError('Le code postal est obligatoire.'); return; }
    if (!localCity.trim()) { setError('La ville est obligatoire.'); return; }

    setError('');
    setSubmitting(true);
    try {
      if (isNew) {
        const result = await initSepaForNewDonor({
          pseudo: (props as NewAccountProps).pendingPseudo,
          pin: (props as NewAccountProps).pendingPin,
          nom: localName.trim(),
          email: localEmail.trim(),
          telephone: localPhone.trim() || undefined,
        });
        if (!result.ok) { setError(result.error); return; }
        setResolvedDonorId(result.data.donorId);
        setClientSecret(result.data.clientSecret);
      }
      setInfoStep(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Étape 2 : IBAN ───────────────────────────────────────────────────────────

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;
    setError('');
    setSubmitting(true);

    const { error: submitErr } = await elements.submit();
    if (submitErr) {
      setError(submitErr.message || 'Erreur de validation.');
      setSubmitting(false);
      return;
    }

    const { setupIntent, error: confirmErr } = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: {
          billing_details: {
            name: localName,
            email: localEmail,
            phone: localPhone.trim(),
            address: {
              line1: localLine1.trim(),
              postal_code: localPostalCode.trim(),
              city: localCity.trim(),
              state: '',
              country: 'FR',
            },
          },
        },
      },
      redirect: 'if_required',
    });

    if (confirmErr) {
      setError(confirmErr.message || 'La configuration SEPA a échoué.');
      setSubmitting(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;

    if (!paymentMethodId) {
      setError('Impossible de récupérer le moyen de paiement.');
      setSubmitting(false);
      return;
    }

    onSuccess(paymentMethodId, isNew ? resolvedDonorId : undefined, isNew ? localName : undefined);
  };

  // ── Rendu étape 1 ────────────────────────────────────────────────────────────
  if (infoStep) {
    return (
      <form onSubmit={handleInfoSubmit} className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-gray-700">Vos coordonnées</p>
            <p className="text-xs text-gray-400">Pour votre mandat SEPA</p>
          </div>
          {amount > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">{amount.toLocaleString('fr-FR')} €</span>
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Nom complet *"
          value={localName}
          onChange={e => setLocalName(e.target.value)}
          className={inputClass}
          autoComplete="name"
        />

        <input
          type="email"
          placeholder="Adresse e-mail *"
          value={localEmail}
          onChange={e => setLocalEmail(e.target.value)}
          className={inputClass}
          autoComplete="email"
        />

        <input
          type="tel"
          placeholder="Téléphone (optionnel)"
          value={localPhone}
          onChange={e => setLocalPhone(e.target.value)}
          className={inputClass}
          autoComplete="tel"
        />

        <input
          type="text"
          placeholder="Adresse *"
          value={localLine1}
          onChange={e => setLocalLine1(e.target.value)}
          className={inputClass}
          autoComplete="street-address"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Code postal *"
            value={localPostalCode}
            onChange={e => setLocalPostalCode(e.target.value)}
            className={inputClass}
            autoComplete="postal-code"
            maxLength={10}
          />
          <input
            type="text"
            placeholder="Ville *"
            value={localCity}
            onChange={e => setLocalCity(e.target.value)}
            className={inputClass}
            autoComplete="address-level2"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Spinner />{isNew ? 'Création du compte...' : 'Chargement...'}</>
            : 'Continuer vers le RIB'
          }
        </button>
      </form>
    );
  }

  // ── Rendu étape 2 : IBAN ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleConfirm} className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-gray-700">Autorisation de prélèvement SEPA</p>
          <p className="text-xs text-gray-400">Mandat électronique sécurisé par Stripe</p>
        </div>
        {amount > 0 && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">{amount.toLocaleString('fr-FR')} €</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="relative min-h-[200px]">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        )}
        <div ref={containerRef} />
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        En confirmant, vous autorisez un prélèvement SEPA récurrent sur votre compte. Le mandat est signé électroniquement et vous pouvez le révoquer à tout moment.
      </p>

      <button
        type="submit"
        disabled={submitting || !ready}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Spinner />Traitement...</>
          : amount > 0
            ? <><RefreshCw className="w-4 h-4" />Autoriser le prélèvement de {amount.toLocaleString('fr-FR')} €</>
            : <><RefreshCw className="w-4 h-4" />Configurer mon IBAN</>
        }
      </button>
    </form>
  );
}

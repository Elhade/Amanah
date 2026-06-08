'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { getStripePromise } from '@/lib/stripe/client';
import { Spinner } from './shared';

interface Props {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
}

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

export function StripePaymentStep({ clientSecret, amount, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');

  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientSecret) return;

    let paymentElement: StripePaymentElement | null = null;

    getStripePromise().then((stripe) => {
      if (!stripe || !containerRef.current) return;
      stripeRef.current = stripe;

      const elements = stripe.elements({ clientSecret, appearance: STRIPE_APPEARANCE });
      elementsRef.current = elements;

      paymentElement = elements.create('payment', {
        fields: { billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' } },
        wallets: { link: 'never' },
      });
      paymentElement.on('ready', () => setReady(true));
      paymentElement.mount(containerRef.current);
    });

    return () => {
      paymentElement?.destroy();
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;

    if (!donorName.trim()) { setError('Le nom complet est obligatoire.'); return; }
    if (!donorEmail.trim() || !/\S+@\S+\.\S+/.test(donorEmail)) {
      setError("L'adresse e-mail est invalide.");
      return;
    }

    setError('');
    setSubmitting(true);

    const { error: submitErr } = await elementsRef.current.submit();
    if (submitErr) {
      setError(submitErr.message || 'Erreur de validation.');
      setSubmitting(false);
      return;
    }

    const { error: confirmErr } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      clientSecret,
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: {
          billing_details: {
            name: donorName.trim(),
            email: donorEmail.trim(),
            phone: donorPhone.trim(),
            address: { country: 'FR', line1: '', city: '', state: '', postal_code: '' },
          },
        },
      },
      redirect: 'if_required',
    });

    if (confirmErr) {
      setError(confirmErr.message || 'Le paiement a échoué.');
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

  return (
    <form onSubmit={handleConfirm} className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-gray-700">Paiement sécurisé</p>
          <p className="text-xs text-gray-400">Crypté par Stripe</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">{amount.toLocaleString('fr-FR')} €</span>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Nom complet *"
          value={donorName}
          onChange={e => setDonorName(e.target.value)}
          className={inputClass}
          autoComplete="name"
        />
        <input
          type="email"
          placeholder="Adresse e-mail *"
          value={donorEmail}
          onChange={e => setDonorEmail(e.target.value)}
          className={inputClass}
          autoComplete="email"
        />
        <input
          type="tel"
          placeholder="Téléphone (optionnel)"
          value={donorPhone}
          onChange={e => setDonorPhone(e.target.value)}
          className={inputClass}
          autoComplete="tel"
        />
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

      <button
        type="submit"
        disabled={submitting || !ready}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Spinner />Traitement...</>
          : <><Lock className="w-4 h-4" />Confirmer le don de {amount.toLocaleString('fr-FR')} €</>
        }
      </button>
    </form>
  );
}

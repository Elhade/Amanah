'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { loadStripeClient } from '@/lib/stripe/client';
import { Spinner, type StripeInstance, type StripeElements } from './shared';

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

  const stripeRef = useRef<StripeInstance | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const cardMountedRef = useRef(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientSecret || !cardContainerRef.current || cardMountedRef.current) return;

    const mount = () => {
      const instance = loadStripeClient();
      if (!instance) return;
      stripeRef.current = instance;
      elementsRef.current = instance.elements({ clientSecret, appearance: STRIPE_APPEARANCE });
      elementsRef.current.create('payment').mount(cardContainerRef.current!);
      cardMountedRef.current = true;
    };

    if (window.Stripe) { mount(); return; }
    const interval = setInterval(() => { if (window.Stripe) { clearInterval(interval); mount(); } }, 100);
    return () => clearInterval(interval);
  }, [clientSecret]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;
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
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (confirmErr) {
      setError(confirmErr.message || 'Le paiement a échoué.');
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div ref={cardContainerRef} className="min-h-[120px]" />

      <button
        type="submit"
        disabled={submitting}
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

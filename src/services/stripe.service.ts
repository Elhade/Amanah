import { stripe } from '@/lib/stripe/server';
import type Stripe from 'stripe';

export interface CardPaymentIntentParams {
  amount: number; // en centimes
  currency?: string;
  metadata?: Record<string, string>;
}

export interface SepaSetupIntentParams {
  customerId: string;
  donorId: string;
}

export interface SepaPaymentParams {
  customerId: string;
  paymentMethodId: string;
  amount: number; // en centimes
  currency?: string;
  metadata?: Record<string, string>;
}

// Crée un PaymentIntent carte. À appeler depuis l'API route create-payment-intent.
export async function createCardPaymentIntent(
  params: CardPaymentIntentParams
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: Math.round(params.amount),
    currency: params.currency ?? 'eur',
    automatic_payment_methods: { enabled: true },
    metadata: { ...params.metadata, payment_type: 'card' },
  });
}

// Retourne le Customer Stripe existant (par email) ou en crée un nouveau — évite les doublons.
export async function createOrRetrieveStripeCustomer(
  email: string,
  nom: string
): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0];
  return stripe.customers.create({ email, name: nom });
}

// Enregistre un mandat SEPA pour un customer existant (usage off_session = prélèvements futurs).
export async function createSepaSetupIntent(
  params: SepaSetupIntentParams
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: params.customerId,
    payment_method_types: ['sepa_debit'],
    usage: 'off_session',
    metadata: { donor_id: params.donorId },
  });
}

// Débite immédiatement un mandat SEPA déjà enregistré (confirm: true, off_session).
export async function createSepaPaymentIntent(
  params: SepaPaymentParams
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: Math.round(params.amount),
    currency: params.currency ?? 'eur',
    customer: params.customerId,
    payment_method: params.paymentMethodId,
    payment_method_types: ['sepa_debit'],
    confirm: true,
    off_session: true,
    metadata: { ...params.metadata, payment_type: 'prelevement_sepa' },
  });
}

// Annule le PaymentIntent s'il n'est pas encore prélevé, rembourse s'il est déjà succeeded.
export async function cancelOrRefundPaymentIntent(
  paymentIntentId: string
): Promise<{ action: 'annule' | 'rembourse' }> {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (
    ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'].includes(
      intent.status
    )
  ) {
    await stripe.paymentIntents.cancel(paymentIntentId);
    return { action: 'annule' };
  }

  if (intent.status === 'succeeded') {
    await stripe.refunds.create({ payment_intent: paymentIntentId });
    return { action: 'rembourse' };
  }

  throw new Error(`Impossible d'annuler un paiement au statut : ${intent.status}`);
}

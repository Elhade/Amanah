import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, metadata } = await req.json();

    if (!amount || typeof amount !== 'number' || amount < 50) {
      return NextResponse.json({ error: 'Montant invalide (minimum 0.50 €)' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: currency ?? 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: metadata ?? {},
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

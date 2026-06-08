import { NextRequest, NextResponse } from 'next/server';
import { createCardPaymentIntent } from '@/services/stripe.service';

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, metadata } = await req.json();

    if (!amount || typeof amount !== 'number' || amount < 50) {
      return NextResponse.json({ error: 'Montant invalide (minimum 0.50 €)' }, { status: 400 });
    }

    const paymentIntent = await createCardPaymentIntent({ amount, currency, metadata });
   
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

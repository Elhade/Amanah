import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2023-10-16',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const meta = intent.metadata ?? {};

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    const { data: donor } = await supabase
      .from('donors')
      .insert({ nom: meta.donor_name || 'Anonyme' })
      .select()
      .single();

    if (donor) {
      await supabase.from('donations').insert({
        donor_id: donor.id,
        leader_id: meta.leader_id || null,
        project_id: meta.project_id || null,
        montant: intent.amount / 100,
        methode: 'stripe',
        statut: 'paid',
      });
    }
  }

  return NextResponse.json({ received: true });
}

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getDonationByIntentId,
  updateDonationStatut,
} from '@/services/donations.service';
import { updateDonorPaymentMethod } from '@/services/donors.service';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const meta = intent.metadata ?? {};

      if (meta.payment_type === 'prelevement_sepa') {
        const donation = await getDonationByIntentId(intent.id);
        if (donation) await updateDonationStatut(donation.id, 'paid');
      } else {
        // Paiement carte : crée le donateur et le don
        const supabase = createAdminClient();
        const { data: donor } = await supabase
          .from('donors')
          .insert({
            nom: meta.donor_name || 'Anonyme',
            email: meta.donor_email || null,
            telephone: meta.donor_phone || null,
          })
          .select('id')
          .single();

        if (donor) {
          await supabase.from('donations').insert({
            donor_id: donor.id,
            leader_id: meta.leader_id || null,
            project_id: meta.project_id || null,
            montant: intent.amount / 100,
            methode: 'card',
            statut: 'paid',
            stripe_payment_intent_id: intent.id,
          });
        }
      }
      break;
    }

    case 'payment_intent.processing': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const donation = await getDonationByIntentId(intent.id);
      if (donation) await updateDonationStatut(donation.id, 'processing');
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const donation = await getDonationByIntentId(intent.id);
      if (donation) await updateDonationStatut(donation.id, 'failed');
      break;
    }

    case 'setup_intent.succeeded': {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const donorId = setupIntent.metadata?.donor_id;
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;

      if (donorId && paymentMethodId) {
        await updateDonorPaymentMethod(donorId, paymentMethodId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

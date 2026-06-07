import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import {
  getDonationByIntentId,
  updateDonationStatut,
  createDonation,
  updateDonationsStatutByRemittance,
  clearRemittanceFromDonations,
} from '@/services/donations.service';
import { createCasualDonor, updateDonorStripeFields } from '@/services/donors.service';
import {
  getRemittanceByIntentId,
  updateRemittanceStatut,
} from '@/services/remittances.service';
import { upsertBalanceTransaction } from '@/services/balance-transactions.service';

async function extractAndStoreBalanceTransaction(intent: Stripe.PaymentIntent): Promise<string | null> {
  try {
    const chargeId = typeof intent.latest_charge === 'string'
      ? intent.latest_charge
      : (intent.latest_charge as Stripe.Charge | null)?.id;
    if (!chargeId) return null;

    const charge = await stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] });
    const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
    if (!bt || typeof bt !== 'object' || !('fee' in bt)) return null;

    const result = await upsertBalanceTransaction({
      stripeBtId: bt.id,
      amount: bt.amount / 100,
      fee: bt.fee / 100,
      net: bt.net / 100,
    });
    return result?.id ?? null;
  } catch {
    return null;
  }
}

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
    case 'payment_intent.processing': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const meta = intent.metadata ?? {};

      if (meta.payment_type === 'cash_remittance' && meta.remittance_id) {
        await updateRemittanceStatut(meta.remittance_id, 'processing', intent.id);
      } else if (meta.payment_type === 'prelevement_sepa' && meta.donor_id) {
        const existing = await getDonationByIntentId(intent.id);
        if (!existing) {
          await createDonation({
            donorId: meta.donor_id,
            leaderId: meta.leader_id || null,
            projectId: meta.project_id,
            montant: intent.amount / 100,
            methode: 'prelevement_sepa',
            statut: 'processing',
            stripePaymentIntentId: intent.id,
          });
        }
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const meta = intent.metadata ?? {};

      if (meta.payment_type === 'cash_remittance' && meta.remittance_id) {
        let remittance = await getRemittanceByIntentId(intent.id);
        if (!remittance) remittance = { id: meta.remittance_id, leader_id: meta.leader_id };
        const btId = await extractAndStoreBalanceTransaction(intent);
        await updateRemittanceStatut(remittance.id, 'cash_remitted', undefined, btId);
        await updateDonationsStatutByRemittance(remittance.id, 'cash_remitted');

        // Don personnel inclus dans ce virement (créé APRÈS le bulk update pour rester 'paid')
        if (meta.personal_amount && meta.personal_donor_id && meta.personal_project_id) {
          const personalDon = await createDonation({
            donorId: meta.personal_donor_id,
            leaderId: meta.leader_id || null,
            projectId: meta.personal_project_id,
            montant: parseFloat(meta.personal_amount),
            methode: 'prelevement_sepa',
            statut: 'paid',
            stripePaymentIntentId: intent.id,
            balanceTransactionId: btId,
            remittanceId: remittance.id,
          });
          // Mise à jour du montant personnel sur la remittance pour l'affichage
          const { createServerClient } = await import('@/lib/supabase/server');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (createServerClient().from('remittances') as any).update({
            personal_amount: parseFloat(meta.personal_amount),
            personal_donor_id: meta.personal_donor_id,
            personal_project_id: meta.personal_project_id,
          }).eq('id', remittance.id);
          void personalDon; // évite unused warning
        }

        revalidatePath('/');

      } else if (meta.payment_type === 'prelevement_sepa') {
        const btId = await extractAndStoreBalanceTransaction(intent);
        const donation = await getDonationByIntentId(intent.id);
        if (donation) {
          await updateDonationStatut(donation.id, 'paid', { balance_transaction_id: btId });
        } else if (meta.donor_id) {
          await createDonation({
            donorId: meta.donor_id,
            leaderId: meta.leader_id || null,
            projectId: meta.project_id,
            montant: intent.amount / 100,
            methode: 'prelevement_sepa',
            statut: 'paid',
            stripePaymentIntentId: intent.id,
            balanceTransactionId: btId,
          });
        }
        revalidatePath('/');

      } else {
        // Carte CB
        try {
          const btId = await extractAndStoreBalanceTransaction(intent);
          const pmId = typeof intent.payment_method === 'string'
            ? intent.payment_method
            : intent.payment_method?.id;
          let donorNom = 'Anonyme', donorEmailVal = '', donorTel: string | undefined;
          if (pmId) {
            const pm = await stripe.paymentMethods.retrieve(pmId);
            donorNom = pm.billing_details.name || 'Anonyme';
            donorEmailVal = pm.billing_details.email || '';
            donorTel = pm.billing_details.phone || undefined;
          }
          const { id: donorId } = await createCasualDonor({
            nom: donorNom,
            email: donorEmailVal,
            telephone: donorTel,
          });
          await createDonation({
            donorId,
            leaderId: meta.leader_id || null,
            projectId: meta.project_id || '',
            montant: intent.amount / 100,
            methode: 'card',
            statut: 'paid',
            stripePaymentIntentId: intent.id,
            balanceTransactionId: btId,
          });
          revalidatePath('/');
        } catch (err) {
          console.error('[webhook] card donor/donation error:', err);
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const meta = intent.metadata ?? {};

      if (meta.payment_type === 'cash_remittance' && meta.remittance_id) {
        await updateRemittanceStatut(meta.remittance_id, 'failed');
        await clearRemittanceFromDonations(meta.remittance_id);
      } else {
        const donation = await getDonationByIntentId(intent.id);
        if (donation) await updateDonationStatut(donation.id, 'failed');
      }
      break;
    }

    case 'setup_intent.succeeded': {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const donorId = setupIntent.metadata?.donor_id;
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;
      const customerId =
        typeof setupIntent.customer === 'string'
          ? setupIntent.customer
          : setupIntent.customer?.id;

      if (donorId && paymentMethodId && customerId) {
        await updateDonorStripeFields(donorId, paymentMethodId, customerId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

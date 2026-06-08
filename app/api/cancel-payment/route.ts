import { NextRequest, NextResponse } from 'next/server';
import { cancelOrRefundPaymentIntent } from '@/services/stripe.service';
import { getDonationByIntentId, updateDonationStatut } from '@/services/donations.service';

export async function POST(req: NextRequest) {
  try {
    const { payment_intent_id } = await req.json();

    if (!payment_intent_id) {
      return NextResponse.json({ error: 'payment_intent_id requis.' }, { status: 400 });
    }

    const { action } = await cancelOrRefundPaymentIntent(payment_intent_id);

    const donation = await getDonationByIntentId(payment_intent_id);
    if (donation) {
      await updateDonationStatut(donation.id, 'failed');
    }

    const message =
      action === 'annule'
        ? 'Prélèvement annulé avec succès.'
        : 'Remboursement initié avec succès.';

    return NextResponse.json({ success: true, action, message });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

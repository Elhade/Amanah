import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSepaPaymentIntent } from '@/services/stripe.service';
import { createDonation } from '@/services/donations.service';

export async function POST(req: NextRequest) {
  try {
    const { donor_id, montant, leader_id, project_id, payment_method_id } = await req.json();

    if (!donor_id || !montant || !project_id) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: donor } = await supabase
      .from('donors')
      .select('stripe_customer_id, stripe_payment_method_id')
      .eq('id', donor_id)
      .single();

    if (!donor?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Aucun compte Stripe pour ce donateur.' },
        { status: 400 }
      );
    }

    // payment_method_id peut venir directement du client (juste après confirmSetup),
    // ce qui évite la race condition avec le webhook.
    const resolvedPmId = payment_method_id ?? donor.stripe_payment_method_id;
    if (!resolvedPmId) {
      return NextResponse.json(
        { error: 'Aucun moyen de paiement SEPA enregistré pour ce donateur.' },
        { status: 400 }
      );
    }

    if (payment_method_id && payment_method_id !== donor.stripe_payment_method_id) {
      await supabase
        .from('donors')
        .update({ stripe_payment_method_id: payment_method_id })
        .eq('id', donor_id);
    }

    const intent = await createSepaPaymentIntent({
      customerId: donor.stripe_customer_id,
      paymentMethodId: resolvedPmId,
      amount: Math.round(montant * 100),
      metadata: {
        payment_type: 'prelevement_sepa',
        donor_id,
        leader_id: leader_id ?? '',
        project_id,
      },
    });

    await createDonation({
      donorId: donor_id,
      leaderId: leader_id ?? null,
      projectId: project_id,
      montant,
      methode: 'prelevement_sepa',
      statut: 'pending',
      stripePaymentIntentId: intent.id,
    });

    return NextResponse.json({ success: true, paymentIntentId: intent.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

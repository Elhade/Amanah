import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSepaPaymentIntent } from '@/services/stripe.service';

export async function POST(req: NextRequest) {
  try {
    const { donor_id, montant, leader_id, project_id, payment_method_id } = await req.json();

    if (!donor_id || !montant || !project_id || !payment_method_id) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: donor } = await supabase
      .from('donors')
      .select('stripe_customer_id')
      .eq('id', donor_id)
      .single();

    if (!donor?.stripe_customer_id) {
      return NextResponse.json({ error: 'Aucun compte Stripe pour ce donateur.' }, { status: 400 });
    }

    const intent = await createSepaPaymentIntent({
      customerId: donor.stripe_customer_id,
      paymentMethodId: payment_method_id,
      amount: Math.round(montant * 100),
      metadata: {
        payment_type: 'prelevement_sepa',
        donor_id,
        leader_id: leader_id ?? '',
        project_id,
      },
    });

    return NextResponse.json({ success: true, paymentIntentId: intent.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

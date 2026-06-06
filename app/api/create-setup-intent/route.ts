import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createOrRetrieveStripeCustomer, createSepaSetupIntent } from '@/services/stripe.service';

export async function POST(req: NextRequest) {
  try {
    const { donor_id, email, nom } = await req.json();

    if (!donor_id || !email || !nom) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const customer = await createOrRetrieveStripeCustomer(email, nom);

    const supabase = createServerClient();
    const { error: dbError } = await supabase
      .from('donors')
      .update({ stripe_customer_id: customer.id })
      .eq('id', donor_id);
    if (dbError) throw new Error('Impossible de sauvegarder le compte Stripe.');

    const setupIntent = await createSepaSetupIntent({ customerId: customer.id, donorId: donor_id });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

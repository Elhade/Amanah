import { NextRequest, NextResponse } from 'next/server';
import { createOrRetrieveStripeCustomer, createSepaSetupIntent } from '@/services/stripe.service';
import { updateDonorStripeCustomer } from '@/services/donors.service';

export async function POST(req: NextRequest) {
  try {
    const { donor_id, email, nom } = await req.json();

    if (!donor_id || !email || !nom) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const customer = await createOrRetrieveStripeCustomer(email, nom);
    await updateDonorStripeCustomer(donor_id, customer.id);

    const setupIntent = await createSepaSetupIntent({ customerId: customer.id, donorId: donor_id });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

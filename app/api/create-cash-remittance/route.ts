import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createCashRemittancePaymentIntent } from '@/services/stripe.service';
import { createRemittance, updateRemittanceStatut } from '@/services/remittances.service';
import { linkDonationsToRemittance } from '@/services/donations.service';

export async function POST(req: NextRequest) {
  try {
    const { leader_id, donation_ids } = await req.json() as {
      leader_id: string;
      donation_ids: string[];
    };

    if (!leader_id || !donation_ids?.length) {
      return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: leader } = await supabase
      .from('leaders')
      .select('donor_id')
      .eq('id', leader_id)
      .single();

    if (!leader?.donor_id) {
      return NextResponse.json({ error: 'IBAN non configuré pour ce responsable.' }, { status: 400 });
    }

    const { data: leaderDonor } = await supabase
      .from('donors')
      .select('stripe_customer_id, stripe_payment_method_id')
      .eq('id', leader.donor_id)
      .single();

    if (!leaderDonor?.stripe_customer_id || !leaderDonor?.stripe_payment_method_id) {
      return NextResponse.json({ error: 'IBAN non configuré pour ce responsable.' }, { status: 400 });
    }

    // Vérifie que les donations sont bien cash_received, appartiennent à ce leader, et pas déjà en remise
    const { data: donations, error: dErr } = await supabase
      .from('donations')
      .select('id, montant')
      .in('id', donation_ids)
      .eq('leader_id', leader_id)
      .eq('statut', 'cash_received')
      .is('remittance_id', null);

    if (dErr || !donations?.length) {
      return NextResponse.json({ error: 'Aucun don éligible trouvé.' }, { status: 400 });
    }

    const montant = donations.reduce((s, d) => s + Number(d.montant), 0);
    const verifiedIds = donations.map(d => d.id);

    const { id: remittanceId } = await createRemittance({ leaderId: leader_id, montant });
    await linkDonationsToRemittance(verifiedIds, remittanceId);

    const intent = await createCashRemittancePaymentIntent({
      customerId: leaderDonor.stripe_customer_id,
      paymentMethodId: leaderDonor.stripe_payment_method_id,
      amount: Math.round(montant * 100),
      metadata: { leader_id, remittance_id: remittanceId },
    });

    await updateRemittanceStatut(remittanceId, 'processing', intent.id);

    return NextResponse.json({ success: true, remittanceId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

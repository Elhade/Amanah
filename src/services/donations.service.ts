import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import type { DonationMethod, DonationStatus } from '@/types';

export async function getDonationTotalsByProject(): Promise<Record<string, number>> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('donations')
    .select('project_id, montant')
    .eq('statut', 'paid');

  return (data ?? []).reduce<Record<string, number>>((acc, d) => {
    if (d.project_id) acc[d.project_id] = (acc[d.project_id] ?? 0) + Number(d.montant);
    return acc;
  }, {});
}

export interface DonationInput {
  donorId: string;
  leaderId: string | null;
  projectId: string;
  montant: number;
  methode: DonationMethod;
  statut?: DonationStatus;
  stripePaymentIntentId?: string;
}

export async function createDonation(input: DonationInput): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('donations')
    .insert({
      donor_id: input.donorId,
      leader_id: input.leaderId,
      project_id: input.projectId,
      montant: input.montant,
      methode: input.methode,
      statut: input.statut ?? 'pending',
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error("Une erreur est survenue lors de l'enregistrement du don.");
  return { id: (data as { id: string }).id };
}

export async function updateDonationStatut(donationId: string, statut: DonationStatus): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('donations')
    .update({ statut })
    .eq('id', donationId);

  if (error) throw new Error('Erreur lors de la mise à jour du statut du don.');
}

export async function getDonationByIntentId(
  stripePaymentIntentId: string
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('donations')
    .select('id')
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .maybeSingle();
  return data as { id: string } | null;
}

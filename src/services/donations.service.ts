import { createServerClient } from '@/lib/supabase/server';

import type { DonationMethod, DonationStatus } from '@/types';

export async function getDonationTotalsByProject(): Promise<Record<string, number>> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('donations')
    .select('project_id, montant, statut');

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((d) => d.statut === 'paid')
    .reduce<Record<string, number>>((acc, d) => {
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
  balanceTransactionId?: string | null;
}

export async function createDonation(input: DonationInput): Promise<{ id: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('donations')
    .insert({
      donor_id: input.donorId,
      leader_id: input.leaderId,
      project_id: input.projectId,
      montant: input.montant,
      methode: input.methode,
      statut: input.statut ?? 'processing',
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      balance_transaction_id: input.balanceTransactionId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error("Une erreur est survenue lors de l'enregistrement du don.");
  return { id: (data as { id: string }).id };
}

export async function updateDonationStatut(
  donationId: string,
  statut: DonationStatus,
  extra?: { balance_transaction_id?: string | null },
): Promise<void> {
  const supabase = createServerClient();
  const update: Record<string, unknown> = { statut };
  if (extra?.balance_transaction_id !== undefined) update.balance_transaction_id = extra.balance_transaction_id;
  const { error } = await supabase.from('donations').update(update).eq('id', donationId);
  if (error) throw new Error('Erreur lors de la mise à jour du statut du don.');
}

export async function getDonationByIntentId(
  stripePaymentIntentId: string
): Promise<{ id: string } | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('donations')
    .select('id')
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .maybeSingle();
  return data as { id: string } | null;
}

export async function linkDonationsToRemittance(
  donationIds: string[],
  remittanceId: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('donations')
    .update({ remittance_id: remittanceId })
    .in('id', donationIds);
  if (error) throw new Error('Erreur lors du lien des dons à la remise.');
}

export async function updateDonationsStatutByRemittance(
  remittanceId: string,
  statut: DonationStatus
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('donations')
    .update({ statut })
    .eq('remittance_id', remittanceId);
  if (error) throw new Error('Erreur lors de la mise à jour du statut des dons.');
}

export async function clearRemittanceFromDonations(remittanceId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('donations')
    .update({ remittance_id: null, statut: 'cash_received' })
    .eq('remittance_id', remittanceId);
  if (error) throw new Error('Erreur lors de la réinitialisation de la remise des dons.');
}

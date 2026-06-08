import { createServerClient } from '@/lib/supabase/server';

export interface RemittanceInput {
  leaderId: string;
  montant: number;
}

export async function createRemittance(input: RemittanceInput): Promise<{ id: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('remittances')
    .insert({ leader_id: input.leaderId, montant: input.montant })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Erreur lors de la création de la remise. [${error?.code}] ${error?.message}`);
  return { id: (data as { id: string }).id };
}

export async function getRemittanceByIntentId(
  intentId: string
): Promise<{ id: string; leader_id: string } | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('remittances')
    .select('id, leader_id')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();
  return data as { id: string; leader_id: string } | null;
}

export async function updateRemittanceStatut(
  id: string,
  statut: string,
  stripePaymentIntentId?: string,
  balanceTransactionId?: string | null,
): Promise<void> {
  const supabase = createServerClient();
  const update: Record<string, unknown> = { statut };
  if (stripePaymentIntentId) update.stripe_payment_intent_id = stripePaymentIntentId;
  if (balanceTransactionId !== undefined) update.balance_transaction_id = balanceTransactionId;
  const { error } = await supabase.from('remittances').update(update).eq('id', id);
  if (error) throw new Error('Erreur lors de la mise à jour de la remise.');
}

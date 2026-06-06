import { createServerClient } from '@/lib/supabase/server';

export interface BalanceTransactionInput {
  stripeBtId: string;
  amount: number;
  fee: number;
  net: number;
}

export async function upsertBalanceTransaction(input: BalanceTransactionInput): Promise<{ id: string } | null> {
  // Cast nécessaire : balance_transactions n'est pas encore dans les types générés
  // (à régénérer après `supabase db push`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;
  const { data, error } = await supabase
    .from('balance_transactions')
    .upsert(
      {
        stripe_bt_id: input.stripeBtId,
        amount: input.amount,
        fee: input.fee,
        net: input.net,
      },
      { onConflict: 'stripe_bt_id' },
    )
    .select('id')
    .single();

  if (error || !data) return null;
  return { id: (data as { id: string }).id };
}

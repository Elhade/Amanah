import { createServerClient } from '@/lib/supabase/server';

export async function getDonationTotalsByProject(): Promise<Record<string, number>> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('donations')
    .select('project_id, montant')
    .in('statut', ['paid', 'cash_validated']);

  return (data ?? []).reduce<Record<string, number>>((acc, d) => {
    if (d.project_id) acc[d.project_id] = (acc[d.project_id] ?? 0) + Number(d.montant);
    return acc;
  }, {});
}

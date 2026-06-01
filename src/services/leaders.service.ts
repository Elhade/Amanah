import { createServerClient } from '@/lib/supabase/server';
import type { Leader } from '@/types';

export async function getLeaderBySlug(slug: string): Promise<Leader | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('leaders')
    .select('id, user_id, nom_affichage, slug, created_at')
    .eq('slug', slug)
    .maybeSingle();
  return data as Leader | null;
}

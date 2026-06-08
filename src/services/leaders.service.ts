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

export async function updateLeaderProfile(
  leaderId: string,
  data: { nom_affichage: string; nom_equipe: string | null; slug: string }
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('leaders')
    .update({ nom_affichage: data.nom_affichage, nom_equipe: data.nom_equipe, slug: data.slug })
    .eq('id', leaderId);
  if (error) throw new Error(error.message);
}

export async function linkDonorToLeader(leaderId: string, donorId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('leaders')
    .update({ donor_id: donorId })
    .eq('id', leaderId);
  if (error) throw new Error(`Lien échoué : ${error.message} [${error.code}]`);
}

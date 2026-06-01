import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

export interface FoundDonor {
  id: string;
  nom: string;
  pseudo: string | null;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
}

export interface RecurrentDonorInput {
  pseudo: string;
  nom: string;
  email: string;
  telephone?: string;
}

export interface CasualDonorInput {
  nom: string;
  email: string;
  telephone?: string;
}

export async function findDonorByIdentifier(identifier: string): Promise<FoundDonor | null> {
  const supabase = createServerClient();
  const isEmail = identifier.includes('@');
  const { data, error } = await supabase
    .from('donors')
    .select('id, nom, pseudo, email, stripe_customer_id, stripe_payment_method_id')
    .or(isEmail ? `email.eq.${identifier}` : `pseudo.eq.${identifier}`)
    .maybeSingle();
  if (error) throw new Error('Erreur lors de la recherche du compte.');
  return data as FoundDonor | null;
}

export async function isPseudoTaken(pseudo: string): Promise<boolean> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from('donors')
    .select('id', { count: 'exact', head: true })
    .eq('pseudo', pseudo);
  return (count ?? 0) > 0;
}

/** Crée un donateur récurrent (SEPA) avec pseudo. L'IBAN est tokenisé par Stripe — ne jamais stocker en clair. */
export async function createRecurrentDonor(input: RecurrentDonorInput): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('donors')
    .insert({
      nom: input.nom,
      pseudo: input.pseudo,
      email: input.email,
      telephone: input.telephone ?? null,
    })
    .select('id')
    .single();
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === '23505') {
      throw new Error('Ce pseudo est déjà utilisé.');
    }
    throw new Error('Erreur lors de la création du compte.');
  }
  return { id: (data as { id: string }).id };
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from('donors')
    .select('id', { count: 'exact', head: true })
    .eq('email', email.toLowerCase());
  return (count ?? 0) > 0;
}

export async function createCasualDonor(input: CasualDonorInput): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('donors')
    .insert({
      nom: input.nom || 'Anonyme',
      email: input.email || null,
      telephone: input.telephone || null,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error('Erreur lors de la création du profil.');
  return { id: (data as { id: string }).id };
}

export async function updateDonorStripeCustomer(donorId: string, stripeCustomerId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('donors')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', donorId);
  if (error) throw new Error('Erreur lors de la mise à jour du compte Stripe.');
}

export async function updateDonorPaymentMethod(donorId: string, paymentMethodId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('donors')
    .update({ stripe_payment_method_id: paymentMethodId })
    .eq('id', donorId);
  if (error) throw new Error('Erreur lors de la mise à jour du moyen de paiement.');
}

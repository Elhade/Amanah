import { randomUUID, createHash, randomBytes } from 'crypto';
import { createServerClient } from '@/lib/supabase/server';

export function generatePinSalt(): string {
  return randomBytes(16).toString('hex');
}

export function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(salt + pin).digest('hex');
}

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
  pin_hash: string;
  pin_salt: string;
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

export async function findDonorByEmail(email: string): Promise<FoundDonor | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('donors')
    .select('id, nom, pseudo, email, stripe_customer_id, stripe_payment_method_id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw new Error('Erreur lors de la recherche du compte.');
  return data as FoundDonor | null;
}

/** Vérifie pseudo-ou-email + PIN. Retourne le donor si valide, null sinon. */
export async function verifyDonorPin(identifier: string, pin: string): Promise<FoundDonor | null> {
  const supabase = createServerClient();
  const isEmail = identifier.includes('@');
  const { data } = await supabase
    .from('donors')
    .select('id, nom, pseudo, email, stripe_customer_id, stripe_payment_method_id, pin_hash, pin_salt')
    .or(isEmail ? `email.eq.${identifier.toLowerCase()}` : `pseudo.eq.${identifier}`)
    .maybeSingle();

  if (!data || !data.pin_hash || !data.pin_salt) return null;
  const expected = hashPin(pin, data.pin_salt);
  if (expected !== data.pin_hash) return null;

  const { pin_hash: _, pin_salt: __, ...donor } = data;
  return donor as FoundDonor;
}

export async function isPseudoTaken(pseudo: string): Promise<boolean> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from('donors')
    .select('id', { count: 'exact', head: true })
    .eq('pseudo', pseudo);
  return (count ?? 0) > 0;
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from('donors')
    .select('id', { count: 'exact', head: true })
    .eq('email', email.toLowerCase());
  return (count ?? 0) > 0;
}

/** Crée un donateur récurrent (SEPA). L'IBAN est tokenisé par Stripe — ne jamais stocker en clair. */
export async function createRecurrentDonor(input: RecurrentDonorInput): Promise<{ id: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('donors')
    .insert({
      nom: input.nom,
      pseudo: input.pseudo,
      email: input.email,
      telephone: input.telephone ?? null,
      pin_hash: input.pin_hash,
      pin_salt: input.pin_salt,
    })
    .select('id')
    .single();
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === '23505') {
      throw new Error('Ce pseudo est déjà utilisé.');
    }
    throw new Error(`Erreur lors de la création du compte. [${error?.code}] ${error?.message}`);
  }
  return { id: (data as { id: string }).id };
}

export async function createCasualDonor(input: CasualDonorInput): Promise<{ id: string }> {
  const supabase = createServerClient();
  const id = randomUUID();
  const { error } = await supabase
    .from('donors')
    .insert({
      id,
      nom: input.nom,
      email: input.email,
      telephone: input.telephone || null,
    });
  if (error) throw new Error('Erreur lors de la création du profil.');
  return { id };
}


export async function deleteDonor(donorId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase.from('donors').delete().eq('id', donorId);
}

export async function updateDonorStripeFields(
  donorId: string,
  paymentMethodId: string,
  customerId: string
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('donors')
    .update({ stripe_payment_method_id: paymentMethodId, stripe_customer_id: customerId })
    .eq('id', donorId);
  if (error) throw new Error('Erreur lors de la mise à jour du moyen de paiement.');
}

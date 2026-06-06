'use server';

import { updateLeaderProfile, linkDonorToLeader } from '@/services/leaders.service';
import { verifyDonorPin, createRecurrentDonor, generatePinSalt, hashPin, deleteDonor, updateDonorStripeFields } from '@/services/donors.service';
import { createServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type LinkedDonorInfo = { id: string; pseudo: string | null; hasSEPA: boolean };

/** Lie un compte donateur existant (identifié par pseudo/email + PIN) au leader. */
export async function linkExistingDonorToLeaderAction(
  leaderId: string,
  identifier: string,
  pin: string
): Promise<ActionResult<LinkedDonorInfo>> {
  try {
    const donor = await verifyDonorPin(identifier, pin);
    if (!donor) return { ok: false, error: 'Identifiant ou code PIN incorrect.' };
    await linkDonorToLeader(leaderId, donor.id);
    return { ok: true, data: { id: donor.id, pseudo: donor.pseudo, hasSEPA: !!donor.stripe_payment_method_id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

/** Crée un nouveau compte donateur pour le leader et le lie à son profil responsable. */
export async function createAndLinkDonorToLeaderAction(
  leaderId: string,
  pseudo: string,
  pin: string
): Promise<ActionResult<LinkedDonorInfo>> {
  try {
    const supabase = createServerClient();
    const [{ data: { user } }, { data: leaderData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('leaders').select('nom_affichage').eq('id', leaderId).single(),
    ]);
    if (!leaderData) return { ok: false, error: 'Responsable introuvable.' };
    const salt = generatePinSalt();
    const hash = hashPin(pin, salt);
    const donor = await createRecurrentDonor({
      pseudo,
      nom: leaderData.nom_affichage,
      email: user?.email ?? '',
      pin_hash: hash,
      pin_salt: salt,
    });
    try {
      await linkDonorToLeader(leaderId, donor.id);
    } catch (linkErr) {
      // Rollback : libère le pseudo si le lien échoue
      await deleteDonor(donor.id);
      throw linkErr;
    }
    return { ok: true, data: { id: donor.id, pseudo, hasSEPA: false } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

export type SetupIntentData = {
  clientSecret: string;
  donorId: string;
  donorName: string;
  donorEmail: string;
  customerId: string;
};

/** Crée (ou réutilise) le client Stripe du donateur lié et génère un SetupIntent SEPA sans débit. */
export async function createSetupIntentForLeaderAction(
  leaderId: string
): Promise<ActionResult<SetupIntentData>> {
  try {
    const supabase = createServerClient();

    const { data: leader } = await supabase
      .from('leaders')
      .select('donor_id')
      .eq('id', leaderId)
      .single();

    if (!leader?.donor_id) {
      return { ok: false, error: 'Aucun compte donateur lié à ce responsable.' };
    }

    const { data: donor } = await supabase
      .from('donors')
      .select('id, nom, email, stripe_customer_id')
      .eq('id', leader.donor_id)
      .single();

    if (!donor) {
      return { ok: false, error: 'Compte donateur introuvable.' };
    }

    let customerId = (donor as { id: string; nom: string; email: string | null; stripe_customer_id: string | null }).stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: (donor as { nom: string }).nom,
        email: (donor as { email: string | null }).email ?? undefined,
        metadata: { donor_id: donor.id },
      });
      customerId = customer.id;
      await supabase.from('donors').update({ stripe_customer_id: customerId }).eq('id', donor.id);
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['sepa_debit'],
      metadata: { donor_id: donor.id },
    });

    if (!setupIntent.client_secret) {
      return { ok: false, error: 'Impossible de créer la session SEPA.' };
    }

    return {
      ok: true,
      data: {
        clientSecret: setupIntent.client_secret,
        donorId: donor.id,
        donorName: (donor as { nom: string }).nom,
        donorEmail: (donor as { email: string | null }).email ?? '',
        customerId,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

/** Sauvegarde le payment_method_id et customer_id Stripe sur le compte donateur. */
export async function saveLeaderIbanAction(
  donorId: string,
  paymentMethodId: string,
  customerId: string
): Promise<ActionResult> {
  try {
    await updateDonorStripeFields(donorId, paymentMethodId, customerId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

export async function updateLeaderProfileAction(
  leaderId: string,
  data: { nom_affichage: string; nom_equipe: string | null; slug: string }
): Promise<ActionResult> {
  try {
    if (!data.nom_affichage.trim()) return { ok: false, error: 'Le nom est requis.' };
    if (!data.slug.trim()) return { ok: false, error: 'Le slug est requis.' };
    if (!/^[a-z0-9-]+$/.test(data.slug.trim()))
      return { ok: false, error: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.' };
    await updateLeaderProfile(leaderId, {
      nom_affichage: data.nom_affichage.trim(),
      nom_equipe: data.nom_equipe?.trim() || null,
      slug: data.slug.trim(),
    });
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

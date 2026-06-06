'use server';

import { revalidatePath } from 'next/cache';
import { createRecurrentDonorAction } from '@/actions/donor.actions';
import {
  createCasualDonor,
  verifyDonorPin,
  generatePinSalt,
  hashPin,
} from '@/services/donors.service';
import {
  createDonation,
  updateDonationStatut,
  linkDonationsToRemittance,
  updateDonationsStatutByRemittance,
} from '@/services/donations.service';
import {
  createOrRetrieveStripeCustomer,
  createSepaSetupIntent,
  createCashRemittancePaymentIntent,
} from '@/services/stripe.service';
import { createRemittance, updateRemittanceStatut } from '@/services/remittances.service';
import { createServerClient } from '@/lib/supabase/server';
import type { FoundDonor } from '@/services/donors.service';
import type { DonationStatus, DonationMethod } from '@/types';

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

interface NewRecurrentDonorData {
  pseudo: string;
  nom: string;
  email: string;
  telephone?: string;
  pin: string;
  leaderId: string | null;
  projectId: string;
  montant: number;
}

export async function validateExistingDonor(
  data: { identifier: string; pin: string }
): Promise<ActionResult<FoundDonor>> {
  try {
    const donor = await verifyDonorPin(data.identifier.trim(), data.pin);
    if (!donor) {
      return { ok: false, error: 'Identifiant ou PIN incorrect.' };
    }
    return { ok: true, data: donor };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

export async function submitCashDonation(input: {
  donorName: string;
  donorId?: string;
  montant: number;
  projectId: string;
  leaderId: string | null;
}): Promise<void> {
  const resolvedDonorId = input.donorId
    ?? (await createCasualDonor({ nom: input.donorName || 'Anonyme', email: '' })).id;
  await createDonation({
    donorId: resolvedDonorId,
    leaderId: input.leaderId,
    projectId: input.projectId,
    montant: input.montant,
    methode: 'cash',
    statut: 'cash_received',
  });
}

export async function triggerCashRemittance(
  leaderId: string,
  donationIds: string[]
): Promise<ActionResult<{ remittanceId: string }>> {
  try {
    const supabase = createServerClient();

    const { data: leader } = await supabase
      .from('leaders')
      .select('donor_id')
      .eq('id', leaderId)
      .single();

    if (!leader?.donor_id) {
      return { ok: false, error: 'IBAN non configuré pour ce responsable. Veuillez configurer votre compte donateur.' };
    }

    const { data: leaderDonor } = await supabase
      .from('donors')
      .select('stripe_customer_id, stripe_payment_method_id')
      .eq('id', leader.donor_id)
      .single();

    const customerId = leaderDonor?.stripe_customer_id;
    const paymentMethodId = leaderDonor?.stripe_payment_method_id;
    if (!customerId || !paymentMethodId) {
      return { ok: false, error: 'IBAN non configuré pour ce responsable. Veuillez configurer votre compte donateur.' };
    }

    // Vérifie et somme les dons éligibles (statut cash_received suffit — remittance_id peut être d'une tentative avortée)
    const { data: donations, error: dErr } = await supabase
      .from('donations')
      .select('id, montant')
      .in('id', donationIds)
      .eq('leader_id', leaderId)
      .eq('statut', 'cash_received');

    if (dErr) {
      return { ok: false, error: `Erreur requête dons : [${dErr.code}] ${dErr.message}` };
    }
    if (!donations?.length) {
      return { ok: false, error: 'Aucun don éligible trouvé.' };
    }

    const montant = donations.reduce((s, d) => s + Number(d.montant), 0);
    const verifiedIds = donations.map(d => d.id);

    // Crée la remise d'abord pour obtenir son ID à injecter dans les métadonnées Stripe
    const { id: remittanceId } = await createRemittance({ leaderId, montant });
    await linkDonationsToRemittance(verifiedIds, remittanceId);

    const intent = await createCashRemittancePaymentIntent({
      customerId,
      paymentMethodId,
      amount: Math.round(montant * 100),
      metadata: { leader_id: leaderId, remittance_id: remittanceId, payment_type: 'cash_remittance' },
    });

    // Passe les donations en "processing" pour refléter les 2-3j de traitement SEPA
    await updateDonationsStatutByRemittance(remittanceId, 'processing');
    await updateRemittanceStatut(remittanceId, 'processing', intent.id);

    revalidatePath('/historique');
    revalidatePath('/mon-espace');

    return { ok: true, data: { remittanceId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

export interface CashReceivedRow {
  id: string; donorNom: string; montant: number; projectNom: string; createdAt: string;
}

export async function getCashReceivedForLeader(leaderId: string): Promise<ActionResult<CashReceivedRow[]>> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('donations')
      .select('id, montant, created_at, donors!inner(nom), projects!inner(nom)')
      .eq('leader_id', leaderId)
      .eq('statut', 'cash_received')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const rows = ((data ?? []) as unknown as {
      id: string; montant: number; created_at: string;
      donors: { nom: string }; projects: { nom: string };
    }[]).map(d => ({
      id: d.id,
      donorNom: d.donors?.nom || 'Anonyme',
      montant: d.montant,
      projectNom: d.projects?.nom || '—',
      createdAt: d.created_at,
    }));
    return { ok: true, data: rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}


export interface RecentDonationRow {
  id: string;
  donorNom: string;
  projectNom: string;
  leaderNom: string;
  methode: DonationMethod;
  montant: number;
  statut: DonationStatus;
  createdAt: string;
}

export async function getRecentDonationsForLeader(leaderId: string): Promise<ActionResult<RecentDonationRow[]>> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('donations')
      .select('id, montant, statut, methode, created_at, donors(nom), projects(nom), leaders(nom_affichage, nom_equipe)')
      .eq('leader_id', leaderId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    const rows = ((data ?? []) as unknown as {
      id: string; montant: number; statut: string; methode: string; created_at: string;
      donors: { nom: string } | null; projects: { nom: string } | null; leaders: { nom_affichage: string; nom_equipe?: string | null } | null;
    }[]).map(d => ({
      id: d.id,
      donorNom: d.donors?.nom || 'Anonyme',
      projectNom: d.projects?.nom || '—',
      leaderNom: d.leaders?.nom_equipe || d.leaders?.nom_affichage || '—',
      methode: d.methode as DonationMethod,
      montant: d.montant,
      statut: d.statut as DonationStatus,
      createdAt: d.created_at,
    }));
    return { ok: true, data: rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

export async function retryDonation(donationId: string): Promise<ActionResult> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('donations').select('id, montant, methode, donor_id, leader_id, project_id').eq('id', donationId).single();
    if (error || !data) throw new Error('Don introuvable.');
    if (data.methode !== 'prelevement_sepa')
      return { ok: false, error: 'Seuls les prélèvements SEPA peuvent être relancés.' };

    if (!data.donor_id) return { ok: false, error: 'Aucun donateur associé à ce don.' };
    const { data: donor } = await supabase
      .from('donors').select('stripe_customer_id, stripe_payment_method_id').eq('id', data.donor_id).single();
    const donorCustomerId = donor?.stripe_customer_id;
    const donorPaymentMethodId = donor?.stripe_payment_method_id;
    if (!donorCustomerId || !donorPaymentMethodId)
      return { ok: false, error: 'Aucun mandat SEPA trouvé pour ce donateur.' };

    const { createSepaPaymentIntent } = await import('@/services/stripe.service');
    const intent = await createSepaPaymentIntent({
      customerId: donorCustomerId,
      paymentMethodId: donorPaymentMethodId,
      amount: Math.round(data.montant * 100),
      metadata: {
        payment_type: 'prelevement_sepa',
        donor_id: data.donor_id ?? '',
        leader_id: data.leader_id ?? '',
        project_id: data.project_id ?? '',
      },
    });
    await supabase.from('donations')
      .update({ statut: 'processing', stripe_payment_intent_id: intent.id })
      .eq('id', donationId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

export async function registerNewRecurrentDonor(
  data: NewRecurrentDonorData
): Promise<ActionResult<{ donorId: string; stripePaymentMethodId: string | null }>> {
  try {
    const salt = generatePinSalt();
    const donor = await createRecurrentDonorAction({
      pseudo: data.pseudo.trim().toLowerCase(),
      nom: data.nom.trim(),
      email: data.email.trim().toLowerCase(),
      telephone: data.telephone?.trim() || undefined,
      pin_hash: hashPin(data.pin, salt),
      pin_salt: salt,
    });
    return { ok: true, data: { donorId: donor.id, stripePaymentMethodId: null } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

interface InitSepaNewDonorData {
  pseudo: string;
  pin: string;
  nom: string;
  email: string;
  telephone?: string;
}

export async function initSepaForNewDonor(
  data: InitSepaNewDonorData
): Promise<ActionResult<{ donorId: string; clientSecret: string }>> {
  try {
    const salt = generatePinSalt();
    const donor = await createRecurrentDonorAction({
      pseudo: data.pseudo.trim().toLowerCase(),
      nom: data.nom.trim(),
      email: data.email.trim().toLowerCase(),
      telephone: data.telephone?.trim() || undefined,
      pin_hash: hashPin(data.pin, salt),
      pin_salt: salt,
    });

    const customer = await createOrRetrieveStripeCustomer(
      data.email.trim().toLowerCase(),
      data.nom.trim()
    );

    const supabase = createServerClient();
    await supabase
      .from('donors')
      .update({ stripe_customer_id: customer.id })
      .eq('id', donor.id);

    const setupIntent = await createSepaSetupIntent({
      customerId: customer.id,
      donorId: donor.id,
    });

    return { ok: true, data: { donorId: donor.id, clientSecret: setupIntent.client_secret! } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

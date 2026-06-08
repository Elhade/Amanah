'use server';

import {
  findDonorByIdentifier,
  isPseudoTaken,
  checkEmailExists,
  createRecurrentDonor,
  type FoundDonor,
  type RecurrentDonorInput,
} from '@/services/donors.service';

export type { FoundDonor };

/** Recherche un donateur par pseudo ou e-mail. Retourne null si introuvable. */
export async function findDonorByIdentifierAction(
  identifier: string
): Promise<FoundDonor | null> {
  return findDonorByIdentifier(identifier);
}

/** Vérifie si un pseudo est déjà pris. */
export async function isPseudoTakenAction(pseudo: string): Promise<boolean> {
  return isPseudoTaken(pseudo);
}

/** Crée un donateur récurrent (SEPA) avec pseudo et IBAN. */
export async function createRecurrentDonorAction(
  input: RecurrentDonorInput
): Promise<{ id: string }> {
  return createRecurrentDonor(input);
}

// ─── Vérifications temps réel (feedback formulaire) ─────────────────────────

/** Vérifie si un compte existe pour un pseudo ou e-mail donné. */
export async function checkExistingDonorAction(
  identifier: string
): Promise<{ found: false } | { found: true; nom: string }> {
  try {
    const donor = await findDonorByIdentifier(identifier.trim());
    if (!donor) return { found: false };
    return { found: true, nom: donor.nom };
  } catch {
    return { found: false };
  }
}

/** Vérifie si un pseudo est disponible pour un nouveau compte. */
export async function checkPseudoAvailableAction(
  pseudo: string
): Promise<{ available: boolean }> {
  try {
    return { available: !(await isPseudoTaken(pseudo.trim())) };
  } catch {
    return { available: false };
  }
}

/** Vérifie si une adresse e-mail est disponible pour un nouveau compte. */
export async function checkEmailAvailableAction(
  email: string
): Promise<{ available: boolean }> {
  try {
    return { available: !(await checkEmailExists(email.trim().toLowerCase())) };
  } catch {
    return { available: false };
  }
}

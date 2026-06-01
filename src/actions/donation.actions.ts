'use server';

import {
  findDonorByIdentifierAction,
  isPseudoTakenAction,
  createRecurrentDonorAction,
  type FoundDonor,
} from '@/actions/donor.actions';

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

interface ExistingDonorData {
  identifier: string;
}

interface NewRecurrentDonorData {
  pseudo: string;
  nom: string;
  email: string;
  telephone?: string;
  leaderId: string | null;
  projectId: string;
  montant: number;
}

export async function validateExistingDonor(
  data: ExistingDonorData
): Promise<ActionResult<FoundDonor>> {
  try {
    const donor = await findDonorByIdentifierAction(data.identifier.trim());
    if (!donor) {
      return {
        ok: false,
        error: 'Aucun compte trouvé avec cet identifiant. Vérifiez votre pseudo ou e-mail.',
      };
    }
    return { ok: true, data: donor };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

export async function registerNewRecurrentDonor(
  data: NewRecurrentDonorData
): Promise<ActionResult<{ donorId: string }>> {
  try {
    const pseudo = data.pseudo.trim();

    if (await isPseudoTakenAction(pseudo)) {
      return { ok: false, error: 'Ce pseudo est déjà utilisé. Veuillez en choisir un autre.' };
    }

    const donor = await createRecurrentDonorAction({
      pseudo,
      nom: data.nom.trim(),
      email: data.email.trim(),
      telephone: data.telephone?.trim() || undefined,
    });

    return { ok: true, data: { donorId: donor.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Une erreur est survenue.' };
  }
}

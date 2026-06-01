export type { Database } from './database';

export type UserRole = 'super_admin' | 'leader';
export type DonationMethod = 'stripe' | 'paypal' | 'cash' | 'virement';
export type DonationStatus = 'paid' | 'pending' | 'cash_validated';

export interface Profile {
  id: string;
  email: string | null;
  nom: string;
  role: UserRole;
  created_at: string;
}

export interface Leader {
  id: string;
  user_id: string | null;
  nom_affichage: string;
  slug: string;
  created_at: string;
}

export interface Project {
  id: string;
  nom: string;
  description: string;
  objectif: number;
  created_at: string;
}

export interface Donor {
  id: string;
  nom: string;
  pseudo?: string | null;
  email?: string | null;
  telephone?: string | null;
  iban?: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_id: string | null;
  leader_id: string | null;
  project_id: string | null;
  montant: number;
  methode: DonationMethod;
  statut: DonationStatus;
  created_at: string;
  donors?: { nom: string } | null;
  leaders?: { nom_affichage: string; slug: string } | null;
  projects?: { nom: string } | null;
}

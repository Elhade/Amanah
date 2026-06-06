export type { Database } from './database';

export type UserRole = 'super_admin' | 'leader';
export type DonationMethod = 'card' | 'prelevement_sepa' | 'cash';
export type DonationStatus = 'processing' | 'paid' | 'failed' | 'cash_received' | 'cash_remitted';

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
  nom_equipe?: string | null;
  slug: string;
  donor_id?: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  nom: string;
  description: string;
  objectif: number;
  image_url?: string | null;
  created_at: string;
}

export interface Donor {
  id: string;
  nom: string;
  pseudo?: string | null;
  email?: string | null;
  telephone?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_method_id?: string | null;
  created_at: string;
}

export interface BalanceTransaction {
  id: string;
  stripe_bt_id: string;
  amount: number;
  fee: number;
  net: number;
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
  stripe_payment_intent_id: string | null;
  remittance_id?: string | null;
  balance_transaction_id?: string | null;
  balance_transactions?: Pick<BalanceTransaction, 'amount' | 'fee' | 'net'> | null;
  created_at: string;
  donors?: { nom: string } | null;
  leaders?: { nom_affichage: string; nom_equipe?: string | null; slug: string } | null;
  projects?: { nom: string } | null;
}

export interface Remittance {
  id: string;
  leader_id: string;
  stripe_payment_intent_id: string | null;
  montant: number;
  statut: DonationStatus;
  balance_transaction_id?: string | null;
  balance_transactions?: Pick<BalanceTransaction, 'amount' | 'fee' | 'net'> | null;
  created_at: string;
  leaders?: { nom_affichage: string } | null;
}

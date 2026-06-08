import { supabase } from '@/lib/supabase';
import type { Donation, Project, Leader, Remittance } from '@/types';

const DONATION_SELECT = '*, donors(nom), leaders(nom_affichage, nom_equipe, slug), projects(nom), balance_transactions(amount, fee, net)';
const REMITTANCE_SELECT = 'id, leader_id, montant, statut, stripe_payment_intent_id, created_at, balance_transactions(amount, fee, net)';

export async function getAdminFormData(): Promise<{ projects: Project[]; leaders: Leader[] }> {
  const [projectsRes, leadersRes] = await Promise.all([
    supabase.from('projects').select('id, nom, description, objectif, created_at').order('created_at', { ascending: false }),
    supabase.from('leaders').select('id, user_id, nom_affichage, nom_equipe, slug, created_at'),
  ]);
  return {
    projects: (projectsRes.data ?? []) as Project[],
    leaders: (leadersRes.data ?? []) as Leader[],
  };
}

export interface DashboardData {
  allDonations: Donation[];
  allRemittances: Remittance[];
  projects: Project[];
  leaders: Leader[];
}

export async function getRecentDonations(options?: { leaderId?: string; limit?: number }): Promise<Donation[]> {
  const base = supabase
    .from('donations')
    .select(DONATION_SELECT)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 25);

  const { data } = options?.leaderId
    ? await base.eq('leader_id', options.leaderId)
    : await base;

  return (data ?? []) as unknown as Donation[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const [donationsRes, remittancesRes, projectsRes, leadersRes] = await Promise.all([
    supabase.from('donations').select(DONATION_SELECT).order('created_at', { ascending: false }),
    supabase.from('remittances').select(REMITTANCE_SELECT).order('created_at', { ascending: false }),
    supabase.from('projects').select('id, nom, description, objectif, created_at'),
    supabase.from('leaders').select('id, user_id, nom_affichage, nom_equipe, slug, created_at'),
  ]);

  return {
    allDonations: (donationsRes.data ?? []) as unknown as Donation[],
    allRemittances: (remittancesRes.data ?? []) as unknown as Remittance[],
    projects: (projectsRes.data ?? []) as Project[],
    leaders: (leadersRes.data ?? []) as Leader[],
  };
}

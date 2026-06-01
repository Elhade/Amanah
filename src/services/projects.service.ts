import { createServerClient } from '@/lib/supabase/server';
import { getDonationTotalsByProject } from './donations.service';
import type { ProjectWithStats } from '@/types/project';
import { mockProjects,mockProjectsWithStats } from '@/data/projects.mock';
 

export async function getProjects() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

      return mockProjects
  if (error) throw new Error(error.message);
  return data ?? [];

}

export async function getProjectsWithStats(): Promise<ProjectWithStats[]> {
  const [projects, totals] = await Promise.all([
    getProjects(),
    getDonationTotalsByProject(),
  ]);

      return mockProjectsWithStats;

  return projects.map((p) => {
    const objectif = Number(p.objectif);
    const collecte = totals[p.id] ?? 0;
    return {
      ...p,
      objectif,
      collecte,
      pourcentage: objectif > 0 ? Math.min(Math.round((collecte / objectif) * 100), 100) : 0,
    };
  });
}

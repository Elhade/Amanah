import { createServerClient } from '@/lib/supabase/server';
import { getDonationTotalsByProject } from './donations.service';
import type { Project } from '@/types';
import type { ProjectWithStats } from '@/types/project';

export async function getProjects(): Promise<Project[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, nom, description, objectif, image_url, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

export async function getProjectsWithStats(): Promise<ProjectWithStats[]> {
  const [projects, totals] = await Promise.all([
    getProjects(),
    getDonationTotalsByProject(),
  ]);



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

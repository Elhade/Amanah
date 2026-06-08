export interface ProjectWithStats {
  id: string;
  nom: string;
  description: string;
  objectif: number;
  collecte: number;
  pourcentage: number;
  created_at: string;
  image_url?: string | null;
}

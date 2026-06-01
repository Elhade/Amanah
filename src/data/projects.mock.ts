import type { Project } from '@/types';
import type { ProjectWithStats } from '@/types/project';

export const mockProjects: Project[] = [
  {
    id: 'mock-project-1',
    nom: 'Nourrir les Nécessiteux',
    description: 'Distribution de repas chauds et de colis alimentaires aux familles dans le besoin chaque semaine.',
    objectif: 5000,
    created_at: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'mock-project-2',
    nom: 'Sadaqa Jariya — Construction',
    description: "Financement de la construction d'une salle de prière et d'un espace éducatif pour la communauté.",
    objectif: 20000,
    created_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'mock-project-3',
    nom: 'Bourses Étudiantes',
    description: 'Soutien financier aux étudiants méritants issus de familles modestes pour couvrir leurs frais de scolarité.',
    objectif: 10000,
    created_at: '2026-02-01T09:00:00.000Z',
  },
];

export const mockProjectsWithStats: ProjectWithStats[] = [
  {
    id: 'mock-project-1',
    nom: 'Nourrir les Nécessiteux',
    description: 'Distribution de repas chauds et de colis alimentaires aux familles dans le besoin chaque semaine.',
    objectif: 5000,
    collecte: 3820,
    pourcentage: 76,
    image_url: "https://www.countryflags.com/wp-content/uploads/morocco-flag-png-large.png",
    created_at: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'mock-project-2',
    nom: 'Sadaqa Jariya — Construction',
    description: "Financement de la construction d'une salle de prière et d'un espace éducatif pour la communauté.",
    objectif: 20000,
    collecte: 15750,
    pourcentage: 79,
    image_url: "https://www.whyislam.org/wp-content/uploads/2017/08/Mosque-in-Archway.jpg",
    created_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'mock-project-3',
    nom: 'Bourses Étudiantes',
    description: 'Soutien financier aux étudiants méritants issus de familles modestes pour couvrir leurs frais de scolarité.',
    objectif: 10000,
    collecte: 4200,
    pourcentage: 42,
    image_url: "https://factuel.univ-lorraine.fr/wp-content/uploads/2025/06/design_carre-1024x1024.png",
    created_at: '2026-02-01T09:00:00.000Z',
  },
];

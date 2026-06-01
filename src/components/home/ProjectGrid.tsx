import { ProjectCard } from './ProjectCard';
import type { ProjectWithStats } from '@/types/project';
import type { Leader } from '@/types';

interface Props {
  projects: ProjectWithStats[];
  leader?: Leader | null;
}

export function ProjectGrid({ projects, leader }: Props) {
  if (projects.length === 0) {
    return (
      <p className="text-center text-gray-400 py-16 text-sm">
        Aucun projet disponible pour le moment.
      </p>
    );
  }

  return (
   <div className="flex flex-col gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} leader={leader} />
      ))}
    </div>
  );
}

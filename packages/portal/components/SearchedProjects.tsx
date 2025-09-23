import { FullProject } from '@/common/types';
import { ProjectsList } from './Projects';

export const SearchedProjects = ({ projects }: { projects: FullProject[] }) => {
  const projectsCount = projects.length;
  if (!projectsCount) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xl">
        <div>{projectsCount > 1 ? 'Projects' : 'Project'}</div>
        <span className="min-h-6 min-w-6 flex items-center justify-center rounded-full bg-white/20 p-1 px-3 text-center text-xs text-white/50">
          {projectsCount}
        </span>
      </div>
      <ProjectsList projects={projects} analyticsSource="Search Results" />
    </div>
  );
};

import { PROJECTS_SORTED_BY_CREATION_DATE } from '@/common/projects';
import { ProjectItemBox } from '@/components/ProjectItemBox';

export const NewProjects = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">New Projects</div>
      <hr className="border-white/40" />

      <div className="flex flex-col gap-2">
        {PROJECTS_SORTED_BY_CREATION_DATE.slice(0, 4).map((project) => (
          <ProjectItemBox
            key={project.slug}
            slug={project.slug}
            displayMode="preview"
            analyticsSource="New Projects Preview"
          />
        ))}
      </div>
    </div>
  );
};

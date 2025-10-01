import Image from 'next/image';
import { usePostHog } from 'posthog-js/react';
import { twMerge } from 'tailwind-merge';

import { EntityType, FullProject } from '@/common/types';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';

export const OrbitSpotlightProjectPreview = ({
  orbitChainSlug,
  className,
}: {
  orbitChainSlug: string;
  className?: string;
}) => {
  const posthog = usePostHog();

  const projects = useFilteredProjects({
    selectedCategory: 'all',
    selectedSubcategories: [],
    selectedChains: [orbitChainSlug],
  });

  const { openEntitySidePanel: openProjectPanel } = useEntitySidePanel(EntityType.Project);

  const handleProjectClick = (event: React.MouseEvent<HTMLButtonElement>, project: FullProject) => {
    // stop event bubbling
    event.preventDefault();
    event.stopPropagation();

    if (project.slug) {
      openProjectPanel(project.slug);

      posthog?.capture('Project Click', {
        project: project.title,
        Element: 'Orbit chain spotlight',
      });
    }
  };

  return (
    <div className="z-30 flex w-full flex-col items-start gap-4 lg:items-end">
      <div className="text-sm opacity-70 lg:hidden">PROJECTS</div>
      <div
        className={twMerge(
          'flex w-full gap-3 overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible',
          className,
        )}
      >
        {projects.slice(0, 3).map((project) => (
          <div
            key={`project_${project.slug}`}
            className="flex min-w-[200px] flex-1 flex-col items-start gap-4 rounded-md bg-black/60 p-4 text-left hover:bg-black/80"
            onClick={(e: any) => handleProjectClick(e, project)}
          >
            <Image
              src={project.images.logoUrl}
              alt={project.title}
              width={30}
              height={30}
              className="rounded-md border border-white/30"
            />
            <div className="text-base">{project.title}</div>
            <div className="lg:line-clamp[7] line-clamp-4 text-xs opacity-80">
              {project.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

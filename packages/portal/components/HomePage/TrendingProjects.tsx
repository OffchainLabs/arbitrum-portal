import { TRENDING_PROJECTS } from '@/common/projects';
import { ProjectItemBox } from '@/components/ProjectItemBox';
import { ResponsiveHorizontalScrollableLayout } from '@/components/ResponsiveHorizontalScrollableLayout';

export const TrendingProjects = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">Trending Projects</div>
      <div className="-mt-4 text-sm opacity-70">
        Popular things users are doing and talking about on Arbitrum{' '}
      </div>
      <hr className="border-white/40" />

      <ResponsiveHorizontalScrollableLayout>
        {TRENDING_PROJECTS.slice(0, 3).map((project) => (
          <ProjectItemBox
            slug={project.slug}
            key={project.slug}
            analyticsSource={'Homepage Trending Projects'}
            displayMode="spotlight"
            className="max-w-[300px] lg:max-w-none"
          />
        ))}
      </ResponsiveHorizontalScrollableLayout>
    </div>
  );
};

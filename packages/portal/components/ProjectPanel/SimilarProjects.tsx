import { useMemo } from 'react';
import { FullProject } from '@/common/types';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { ProjectItemBox } from '@/components/ProjectItemBox';
import { CHAINS, getChainSlugFromTitle } from '@/common/chains';
import { twMerge } from 'tailwind-merge';

const MAX_LIMIT = 5;

export const SimilarProjects = ({
  project,
  className,
}: {
  project: FullProject;
  className?: string;
}) => {
  const parentProjectId = project.slug;
  const parentProjectSubcategories = project.subcategoryIds;
  const parentProjectChains = project.chains.map((chainTitle) => {
    return getChainSlugFromTitle(chainTitle);
  });

  const _similarProjectsWithoutCategory = useFilteredProjects({
    selectedCategory: '', // ignore the category as it's very broad
    selectedSubcategories: parentProjectSubcategories,
    selectedChains: parentProjectChains,
  });

  const _similarProjectsWithoutChains = useFilteredProjects({
    selectedCategory: '',
    selectedSubcategories: parentProjectSubcategories,
    selectedChains: CHAINS.map((chain) => chain.slug), // ignore the chains to widen the search
  });

  const similarProjects = useMemo(() => {
    return (
      _similarProjectsWithoutCategory.length > 2 // because 1 project will be the self-listing
        ? _similarProjectsWithoutCategory
        : _similarProjectsWithoutChains
    )
      .filter((project) => project.slug !== parentProjectId) // remove self listing if exists
      .sort(() => Math.random() - 0.5) // randomize the list
      .slice(0, MAX_LIMIT); // limit to MAX_LIMIT results

    // we don't want to re-generate `similarProjects` on every render, except when project panel changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentProjectId]);

  if (similarProjects.length === 0) return null;

  const similarProjectsClicked = () => {
    setTimeout(() => {
      // adding a small delay on the click of similar-project
      // so that it doesn't scroll up while the images are still loading
      document
        .getElementsByClassName('side-panel')[0]
        .scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  return (
    <div
      className={twMerge(
        'flex w-full flex-col gap-4 rounded-lg border border-white/20 p-6',
        className,
      )}
    >
      <div className="text-xl">More like this</div>
      {/* <hr className="border-white/40" /> */}
      <div className="flex flex-col gap-4" onClick={similarProjectsClicked}>
        {similarProjects.map((project, index) => (
          <>
            <ProjectItemBox
              key={`similar-${project.id}`}
              lazyload={false}
              slug={project.slug}
              analyticsSource="More like this"
              displayMode="compact"
            />
            {index < similarProjects.length - 1 && (
              <hr className="border-white/20" />
            )}
          </>
        ))}
      </div>
    </div>
  );
};

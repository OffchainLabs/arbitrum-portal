import { getOrbitChainDetailsById } from '@/common/orbitChains';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { ProjectItemBox } from '@/components/ProjectItemBox';

export const ProjectsOnOrbitChain = ({
  orbitChainSlug,
}: {
  orbitChainSlug: string;
}) => {
  const orbitChain = getOrbitChainDetailsById(orbitChainSlug);

  const projects = useFilteredProjects({
    selectedCategory: 'all',
    selectedSubcategories: [],
    selectedChains: [orbitChainSlug],
  });

  if (!orbitChain || !projects.length) return null;

  return (
    <>
      <div className="mt-8 lg:text-lg">Apps on {orbitChain.title}</div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectItemBox
            key={`${orbitChainSlug}-${project.id}`}
            lazyload={false}
            slug={project.slug}
            analyticsSource="Projects on Orbit Chain"
          />
        ))}
      </div>
    </>
  );
};

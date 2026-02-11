import { Metadata } from 'next';

import { getMetaData } from '@/portal/common/getMetaData';
import { ServerSideAppProps, getServerSideAppParams } from '@/portal/common/getServerSideAppParams';
import { Projects } from '@/portal/components/Projects';
import { getFilteredProjects } from '@/portal/hooks/useFilteredProjects';

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Promise<Metadata> {
  return getMetaData(props);
}

export default async function ProjectsPage(props: ServerSideAppProps) {
  const { selectedCategory, selectedSubcategories, selectedChains, selectedSort } =
    await getServerSideAppParams(props);

  const projects = getFilteredProjects({
    selectedCategory,
    selectedSubcategories,
    selectedChains,
  });

  // No project found in existing filters, show no-data-placeholder
  if (projects.length === 0) {
    return (
      <div className="col-span-full mt-16 text-center text-2xl text-white/50">
        Whoops, your filters didn’t match anything in our system
      </div>
    );
  }

  // Else, if the filters don't match a specific category (eg. all, or none, or custom selection) show filtered projects
  return (
    <Projects projects={projects} analyticsSource="Filtered Projects" selectedSort={selectedSort} />
  );
}

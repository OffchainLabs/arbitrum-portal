import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCategoryDetailsById } from '@/portal/common/categories';
import { getMetaData } from '@/portal/common/getMetaData';
import { ServerSideAppProps, getServerSideAppParams } from '@/portal/common/getServerSideAppParams';
import { CategoryPageBanner } from '@/portal/components/CategoryPageBanner';
import { CategoryPageDescription } from '@/portal/components/CategoryPageDescription';
import { Projects } from '@/portal/components/Projects';
import { getFilteredProjects } from '@/portal/hooks/useFilteredProjects';

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Promise<Metadata> {
  return getMetaData(props);
}

export default async function Page(props: ServerSideAppProps) {
  const { selectedCategory, selectedSubcategories, selectedChains, selectedSort } =
    await getServerSideAppParams(props);

  const categoryMetaData = getCategoryDetailsById(selectedCategory);

  const projects = getFilteredProjects({
    selectedCategory,
    selectedSubcategories,
    selectedChains,
  });

  if (!categoryMetaData) {
    // no category data found (eg. invalid category slug in url), redirect back to homepage
    redirect('/projects');
  }

  return (
    <>
      {/* Special banner and descriptions for category homepage */}
      <CategoryPageBanner category={categoryMetaData} />
      <CategoryPageDescription category={categoryMetaData} />

      {/* Filtered projects for the category */}
      <Projects
        projects={projects}
        analyticsSource="Project Categories Page"
        selectedSort={selectedSort}
      />
    </>
  );
}

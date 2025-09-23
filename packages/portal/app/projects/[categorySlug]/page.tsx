import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Projects } from '@/components/Projects';
import { CategoryPageBanner } from '@/components/CategoryPageBanner';
import { CategoryPageDescription } from '@/components/CategoryPageDescription';
import { getCategoryDetailsById } from '@/common/categories';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import { getMetaData } from '@/common/getMetaData';
import {
  ServerSideAppProps,
  getServerSideAppParams,
} from '@/common/getServerSideAppParams';

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Metadata {
  return getMetaData(props);
}

export default function Page(props: ServerSideAppProps) {
  const {
    selectedCategory,
    selectedSubcategories,
    selectedChains,
    selectedSort,
  } = getServerSideAppParams(props);

  const categoryMetaData = getCategoryDetailsById(selectedCategory);

  const projects = useFilteredProjects({
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

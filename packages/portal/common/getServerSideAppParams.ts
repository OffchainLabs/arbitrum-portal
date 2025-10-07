// Extract meaningful, sanitized selected-filters from props passed to the app
// Helpful for SSR or RSCs
import { SortOptions } from './types';

export type ServerSideAppProps = {
  params: Promise<{
    categorySlug?: string;
    searchSlug?: string;
  }>;
  searchParams: Promise<{
    categories?: string; // [legacy]: used to identify old urls so that we can redirect them to updated paths
    subcategories?: string;
    chains?: string;
    project?: string;
    orbitChain?: string;
    sortBy?: SortOptions;
  }>;
};

export const getServerSideAppParams = async (props: ServerSideAppProps) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const selectedCategory = params.categorySlug || 'all';
  const selectedSubcategories = searchParams.subcategories?.split('_') || [];
  const selectedChains = searchParams.chains?.split('_') || [];

  const selectedProject = searchParams.project;
  const searchString = decodeURIComponent(params.searchSlug || '');
  const legacyCategories = searchParams.categories;
  const selectedOrbitChain = searchParams.orbitChain;
  const selectedSort = searchParams.sortBy;

  return {
    selectedCategory,
    selectedSubcategories,
    selectedChains,
    searchString,
    selectedProject,
    legacyCategories,
    selectedOrbitChain,
    selectedSort,
  };
};

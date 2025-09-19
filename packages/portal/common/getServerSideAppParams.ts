// Extract meaningful, sanitized selected-filters from props passed to the app
// Helpful for SSR or RSCs

import { SortOptions } from './types';

export type ServerSideAppProps = {
  params: {
    categorySlug?: string;
    searchSlug?: string;
  };
  searchParams: {
    categories?: string; // [legacy]: used to identify old urls so that we can redirect them to updated paths
    subcategories?: string;
    chains?: string;
    project?: string;
    orbitChain?: string;
    sortBy?: SortOptions;
  };
};

export const getServerSideAppParams = (props: ServerSideAppProps) => {
  const selectedCategory = props?.params.categorySlug || 'all';
  const selectedSubcategories =
    props?.searchParams.subcategories?.split('_') || [];
  const selectedChains = props?.searchParams.chains?.split('_') || [];

  const selectedProject = props?.searchParams.project;
  const searchString = decodeURIComponent(props?.params.searchSlug || '');
  const legacyCategories = props?.searchParams.categories;
  const selectedOrbitChain = props?.searchParams.orbitChain;
  const selectedSort = props?.searchParams.sortBy;

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

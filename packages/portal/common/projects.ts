// Projects' database and utility functions
import projectsJson from '@/public/__auto-generated-projects.json';
import { CATEGORIES, getCategoryFromSubcategory } from './categories';
import { dayjs } from './dateUtils';
import { sortByRank } from './sort';
import {
  ProjectWithSubcategories,
  FullProject,
  SearchableData,
  EntityType,
  SortOptions,
} from './types';

function sortProjectsByTitle(
  a: ProjectWithSubcategories,
  b: ProjectWithSubcategories,
) {
  return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
}

function sortProjectsByDescription(
  a: ProjectWithSubcategories,
  b: ProjectWithSubcategories,
) {
  // a has description, b doesn't, so put a first
  if (a.description && !b.description) {
    return -1;
  }

  // b has description, a doesn't, so put b first
  if (!a.description && b.description) {
    return 1;
  }

  // they both have or don't have description, so they rank the same
  return 0;
}

export function sortProjects(
  a: ProjectWithSubcategories | FullProject,
  b: ProjectWithSubcategories | FullProject,
  sortBy: SortOptions = SortOptions.ARBITRUM_NATIVE, // by default, keep Arbitrum Native projects first
) {
  // sort by `isArbitrumNative` first if the option is selected
  if (sortBy === SortOptions.ARBITRUM_NATIVE) {
    if (a.meta.isArbitrumNative && !b.meta.isArbitrumNative) {
      return -1;
    }
    if (!a.meta.isArbitrumNative && b.meta.isArbitrumNative) {
      return 1;
    }
  }

  if (a.rank || b.rank) return sortByRank(a, b);

  // sort them by description first, so that projects with a description are ranked higher
  const sortProjectsByDescriptionResult = sortProjectsByDescription(a, b);

  // if they are ranked the same, then additionally sort them by title
  if (sortProjectsByDescriptionResult === 0) {
    return sortProjectsByTitle(a, b);
  }

  // otherwise return the result of sorting by description
  return sortProjectsByDescriptionResult;
}

export const getProjectFallbackDescription = (
  project: ProjectWithSubcategories,
) => {
  const subcatTitles = project.subcategories.map((subcat) => subcat.title);
  let concatSubcat = '';

  if (subcatTitles.length === 1) {
    concatSubcat = subcatTitles[0] + ' category';
  } else {
    const lastSubcatTitle = subcatTitles.pop();
    concatSubcat =
      subcatTitles.join(', ') + ' and ' + lastSubcatTitle + ' categories';
  }
  return `${project.title} belongs to the ${concatSubcat}.`;
};
const projectKeyToIndexMap: { [id: string]: number } = {}; // mapping of [projectKey]=>{..index in PROJECTs array}
const projectsList: SearchableData<FullProject>[] = []; // complete projects list

const homepageSpotlight: string[] = [];
const categorySpotlights: { [categoryKey: string]: string[] } = {};

export let CHAINS_WITH_PROJECTS: Record<string, boolean> = {}; // to keep track of non empty chains
const PROJECTS_PER_CHAIN_MAP: Record<string, number> = {}; // to keep track of number of projects per chain

const notionProjects: ProjectWithSubcategories[] = projectsJson.content.map(
  (projectFromNotion) => {
    CHAINS_WITH_PROJECTS = {
      ...CHAINS_WITH_PROJECTS,
      ...(projectFromNotion.chainsMap as Record<string, boolean>),
    };

    Object.keys(projectFromNotion.chainsMap).forEach((chain) => {
      PROJECTS_PER_CHAIN_MAP[chain] = (PROJECTS_PER_CHAIN_MAP[chain] ?? 0) + 1;
    });

    return {
      ...projectFromNotion,
      chainsMap: projectFromNotion.chainsMap as Record<string, boolean>, // assert the type coz inference from JSON is throwing error
    };
  },
);

notionProjects
  //
  .sort(sortProjects)
  .forEach((project, projectIndex) => {
    const projectKey = project.slug;

    // get project categories from it's subcategories
    const subcategoryIds = project.subcategories.map(
      (subcategory) => subcategory.slug,
    );
    const categoryIds = subcategoryIds.reduce(
      (result: string[], subcategoryKey: string) => {
        const categoryKey = getCategoryFromSubcategory(subcategoryKey);
        return categoryKey && !result.includes(categoryKey) // same category shouldn't be included twice
          ? [...result, categoryKey]
          : [...result];
      },
      [],
    );

    // add project to homepage spotlight
    if (project.meta.isFeaturedOnHomePage) {
      homepageSpotlight.push(projectKey);
    }

    // add project to each of the categories' spotlight
    if (project.meta.isFeaturedOnCategoryPage) {
      categoryIds.forEach((categoryId) => {
        if (!categorySpotlights[categoryId])
          categorySpotlights[categoryId] = [];

        categorySpotlights[categoryId].push(projectKey);
      });
    }

    const fullProject = {
      ...project,
      description:
        project.description || getProjectFallbackDescription(project),
      subcategoryIds,
      categoryIds,

      /* keys to help with searching */
      type: EntityType.Project,
    };
    projectKeyToIndexMap[projectKey] = projectIndex;
    projectsList.push({ ...fullProject, entityType: EntityType.Project });
  });

export const PROJECTS = projectsList;

// to show in a blurred state in arcade without revealing any details about upcoming missions
export const ARCADE_LOCKED_PROJECT_DETAILS: SearchableData<FullProject> = {
  categoryIds: ['defi'],
  chains: ['Arbitrum One', 'Arbitrum Nova'],
  chainsMap: { 'Arbitrum One': true, 'Arbitrum Nova': true },
  description: 'Got you! This project is locked. Patience is the key.',
  id: 'dummy',
  images: {
    logoUrl: '/ArbitrumOneLogo.svg',
    bannerUrl: '',
  },
  links: {
    website: '',
    discord: '',
    twitter: '',
    github: '',
  },
  meta: { isLive: true },
  slug: 'dummy-project',
  subcategories: [],
  subcategoryIds: ['defi-tool'],
  title: 'Dummy Project',
  entityType: EntityType.Project,
};

export const getProjectDetailsById = (id: string) => {
  // We don't want to add dummy project to Projects map, otherwise it would be displayed everywhere
  if (id === 'dummy-project') {
    return ARCADE_LOCKED_PROJECT_DETAILS;
  }
  return typeof projectKeyToIndexMap[id] === 'number'
    ? PROJECTS[projectKeyToIndexMap[id]]
    : null;
};

export const getSpotlightProjects = (key: string) => {
  if (key === 'homepage') return homepageSpotlight;

  // else return category spotlights
  if (categorySpotlights[key]) return categorySpotlights[key];

  return [];
};

// note: [...PROJECTS] spread operator used to avoid mutating the original array
export const PROJECTS_SORTED_BY_CREATION_DATE = [...PROJECTS].sort((a, b) => {
  return dayjs(a.meta.createdTime).isBefore(dayjs(b.meta.createdTime)) ? 1 : -1;
});

export const ALL_SPOTLIGHT_PROJECTS = CATEGORIES.map((category) =>
  getSpotlightProjects(category.slug),
)
  .flat()
  .map((projectKey) => getProjectDetailsById(projectKey))
  .filter(Boolean) as SearchableData<FullProject>[];

export const TRENDING_PROJECTS = PROJECTS.filter(
  (project) => project.meta.isTrending,
);

export const getProjectsCountForChain = (chainTitle: string) => {
  return PROJECTS_PER_CHAIN_MAP[chainTitle] ?? 0;
};

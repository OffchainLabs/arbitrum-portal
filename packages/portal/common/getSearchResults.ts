/*
  Server-side friendly fuzzy search function
*/

import Fuse from 'fuse.js';
import { PROJECTS } from './projects';
import { CATEGORIES } from './categories';
import { SUBCATEGORIES } from './subcategories';
import { Category, FullProject, SearchableData, Subcategory } from './types';
import { ORBIT_CHAINS } from './orbitChains';

export type SearchResult =
  | SearchableData<FullProject>
  | SearchableData<Category>
  | SearchableData<Subcategory>;

export type FuzzySearchResult = Fuse.FuseResult<SearchResult>;

export const getSearchResults = (searchString: string): FuzzySearchResult[] => {
  if (searchString.length >= 2) {
    const fuse = new Fuse(
      [...PROJECTS, ...CATEGORIES, ...SUBCATEGORIES, ...ORBIT_CHAINS],
      {
        includeMatches: true,
        threshold: 0.35,
        keys: ['title', 'searchTitle', 'tags'],
      },
    );

    return fuse.search(searchString);
  } else {
    return [];
  }
};

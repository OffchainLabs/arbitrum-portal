// Categories' database and utility functions
import categoriesJson from '@/public/__auto-generated-categories.json';
import categoriesToSubcategoriesJson from '@/public/__auto-generated-categories-to-subcategories.json';
import { Category, EntityType, SearchableData, Subcategory } from './types';

const categoryMetaData: {
  [slug: string]: { image: string; description: string };
} = {
  defi: {
    image: '/images/illustration-defi.webp',
    description: 'Explore financial projects.',
  },
  'ai-and-depin': {
    image: '/images/illustration-infra-tools.webp',
    description: 'Explore the new wave of intelligence.',
  },
  nfts: {
    image: '/images/illustration-nft.webp',
    description: 'Browse new art collections.',
  },
  gaming: {
    image: '/images/illustration-gaming.webp',
    description: 'Enter into new worlds.',
  },

  'bridges-and-on-ramps': {
    image: '/images/illustration-bridges-onramps.webp',
    description: 'Move your money.',
  },
  'infra-and-tools': {
    image: '/images/illustration-infra-tools.webp',
    description: 'Build your app.',
  },
};

export const CATEGORIES: SearchableData<Category>[] = categoriesJson.content
  .sort((a, b) => a.rank - b.rank)
  .map((categoryFromNotion) => {
    const category = {
      ...categoryFromNotion,
      subcategories: categoryFromNotion.subcategories as Subcategory[], // assert the type coz inference from JSON is throwing error
    };

    return {
      entityType: EntityType.Category,
      ...category,
      ...(categoryMetaData[category.slug] ?? {}),

      /* keys to help with searching */
      searchTitle: `Filter projects by: ${category.title}`,
      tags: ['entityType', 'category', 'categories'],
    };
  });

const categoryKeyToIndexMap: { [id: string]: number } = Object.fromEntries(
  CATEGORIES.map((category, index) => [category.slug, index]),
);

export const CATEGORY_TO_SUBCATEGORIES: { [categoryKey: string]: string[] } =
  categoriesToSubcategoriesJson.content;

export const getCategoryDetailsById = (categoryId: string) => {
  return categoryKeyToIndexMap[categoryId] > -1
    ? CATEGORIES[categoryKeyToIndexMap[categoryId]]
    : null;
};

export const getCategoryFromSubcategory = (subcategoryKey: string) => {
  const categoryKey = Object.keys(CATEGORY_TO_SUBCATEGORIES).find(
    (categoryKey) =>
      CATEGORY_TO_SUBCATEGORIES[categoryKey].includes(subcategoryKey),
  );
  return categoryKey ?? null;
};
export const isCategory = (category: string) =>
  categoryKeyToIndexMap[category] !== undefined;

// returns the `category-key` if the SUBCATEGORIES provided completely match a single CATEGORY
// returns `false` if the CATEGORY is partially selected OR has any SUBCATEGORIES outside of it
export function getCategoryBySubcategoryList(
  subcategoryList: string[],
): string | false {
  let fullySelectedCategory = '';

  const inputSubcategoriesStringified = subcategoryList.sort().join('_');

  Object.keys(CATEGORY_TO_SUBCATEGORIES).forEach((categoryKey) => {
    const allSubcategoriesInCategory = CATEGORY_TO_SUBCATEGORIES[categoryKey]
      .sort()
      .join('_');

    if (inputSubcategoriesStringified === allSubcategoriesInCategory) {
      fullySelectedCategory = categoryKey;
    }
  });

  return fullySelectedCategory ? fullySelectedCategory : false;
}

export const sortByCategoryRank = (a: string, b: string) => {
  return (
    (getCategoryDetailsById(a)?.rank ?? 0) -
    (getCategoryDetailsById(b)?.rank ?? 0)
  );
};

export const VALID_CATEGORY_SLUGS = CATEGORIES.map((cat) => cat.slug);

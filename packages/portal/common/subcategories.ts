// Subcategories' database and utility functions
import subcategoriesJson from '@/public/__auto-generated-subcategories.json';
import {
  Subcategory,
  FullSubcategory,
  SearchableData,
  EntityType,
  AppCount,
} from '@/common/types';
import { getCategoryFromSubcategory } from './categories';

function sanitizeAppCount(obj: any): AppCount {
  const sanitized: AppCount = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && typeof obj[key] === 'number') {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
}

const subcategories: Subcategory[] = subcategoriesJson.content.map(
  (subcategory) => {
    return {
      ...subcategory,
      appCount: sanitizeAppCount(subcategory.appCount),
    };
  },
);

export const SUBCATEGORIES: SearchableData<FullSubcategory>[] =
  subcategories.map((subcat) => {
    return {
      ...subcat,
      categoryId: getCategoryFromSubcategory(subcat.slug),

      /* keys to help with searching */
      entityType: EntityType.Subcategory,
      searchTitle: `Filter projects by: ${subcat.title}`,
      tags: ['subcategory', 'subcategories'],
    };
  });

const subcategoryKeyToIndexMap: { [id: string]: number } = Object.fromEntries(
  SUBCATEGORIES.map((subcat, index) => [subcat.slug, index]),
);

export const getSubcategoryDetailsById = (id: string) => {
  return subcategoryKeyToIndexMap[id] > -1
    ? SUBCATEGORIES[subcategoryKeyToIndexMap[id]]
    : null;
};

export const sortBySubcategoryRank = (a: string, b: string) => {
  return (
    (getSubcategoryDetailsById(a)?.rank ?? 0) -
    (getSubcategoryDetailsById(b)?.rank ?? 0)
  );
};

export const VALID_SUBCATEGORY_SLUGS = SUBCATEGORIES.map(
  (subcat) => subcat.slug,
);

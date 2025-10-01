import { Category } from '@/common/types';

import { FilterTag } from '../FilterTag';

export const SubcategoriesList = ({ category }: { category: Category }) => (
  <ul className="mt-2 flex flex-col items-start justify-center gap-2 lg:gap-0">
    {category.subcategories.map((subcategory) => (
      <FilterTag key={subcategory.slug} category={category} subcategory={subcategory} />
    ))}
  </ul>
);

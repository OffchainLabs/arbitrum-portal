import { CategorySection } from './CategorySection/CategorySection';
import { CATEGORIES } from '@/common/categories';

export const CategoriesPanel = () => (
  <div className="shrink-0 grow-0 flex-nowrap p-4 lg:flex lg:max-h-[700px] lg:w-[900px] lg:flex-col lg:flex-wrap lg:gap-4 lg:p-0">
    {CATEGORIES.map((category) => (
      <CategorySection key={category.slug} category={category} />
    ))}
  </div>
);

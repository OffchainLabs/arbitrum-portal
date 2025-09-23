import { Subcategory } from '@/common/types';

export const SelectedSubcategories = ({
  selectedSubcategoriesWithinCategory,
}: {
  selectedSubcategoriesWithinCategory: Subcategory[];
}) => {
  if (selectedSubcategoriesWithinCategory.length === 0) {
    return null;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-x-1 gap-y-1 text-sm text-gray-500">
      {selectedSubcategoriesWithinCategory.map((selectedSubcategory) => (
        <span className="px-3 py-1" key={selectedSubcategory.slug}>
          {selectedSubcategory.title}
        </span>
      ))}
    </div>
  );
};

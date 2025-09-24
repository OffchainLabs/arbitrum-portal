// Returns whatever category has been selected in the URL

import { usePathname } from 'next/navigation';

export const useSelectedCategory = () => {
  const pathname = usePathname();
  const selectedCategory: string = pathname.split('/projects/')[1] ?? 'all';

  return {
    selectedCategory,
  };
};

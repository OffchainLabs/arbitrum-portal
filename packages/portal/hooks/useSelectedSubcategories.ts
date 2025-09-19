'use client';

import { useArbQueryParams } from './useArbQueryParams';

export const useSelectedSubcategories = () => {
  //  get the subcategories present in the URL
  const [{ subcategories: urlSubcategories }] = useArbQueryParams();

  // return the final source of truth of all selected subcategories
  return { selectedSubcategories: urlSubcategories };
};

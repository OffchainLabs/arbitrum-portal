import { withDefault, StringParam, useQueryParams } from 'use-query-params';
import { useCallback, useMemo } from 'react';

import { CHAINS } from '@/common/chains';
import { SortOptions } from '../common/types';

const defaultChains = CHAINS.map((network) => network.slug).join('_');

const config = {
  search: withDefault(StringParam, ''),
  categories: withDefault(StringParam, ''),
  subcategories: withDefault(StringParam, ''),
  chains: withDefault(StringParam, defaultChains),
  project: withDefault(StringParam, ''),
  orbitChain: withDefault(StringParam, ''),
  groupBy: withDefault(StringParam, 'subcategory'),
  myAppsView: withDefault(StringParam, 'all'),
  sortBy: withDefault(StringParam, SortOptions.ARBITRUM_NATIVE),
};
export function useArbQueryParams() {
  const [
    {
      search,
      categories,
      subcategories,
      chains,
      project,
      orbitChain,
      groupBy,
      myAppsView,
      sortBy,
    },
    setQueryParams,
  ] = useQueryParams(config);

  const setter = useCallback(
    (...args: Parameters<typeof setQueryParams>) => {
      return setQueryParams(...args);
    },
    [setQueryParams],
  );
  const categoriesMemo = useMemo(() => {
    return categories.split('_');
  }, [categories]);
  const subcategoriesMemo = useMemo(() => {
    return subcategories.split('_').filter((chain) => !!chain) as string[];
  }, [subcategories]);
  const chainsMemo = useMemo(() => {
    return chains.split('_').filter((chain) => !!chain) as string[];
  }, [chains]);

  return useMemo(() => {
    return [
      {
        search,
        categories: categoriesMemo,
        subcategories: subcategoriesMemo,
        chains: chainsMemo,
        project,
        orbitChain,
        groupBy,
        myAppsView,
        sortBy,
      },
      setter,
    ] as const;
  }, [
    search,
    categoriesMemo,
    subcategoriesMemo,
    chainsMemo,
    project,
    orbitChain,
    groupBy,
    myAppsView,
    sortBy,
    setter,
  ]);
}

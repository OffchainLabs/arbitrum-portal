'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { usePostHog } from 'posthog-js/react';

import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import { FuzzySearchResult, getSearchResults } from '@/common/getSearchResults';
import { EntityType } from '@/common/types';

type SearchStore = {
  searchString: string;
  setSearchString: (value: string) => void;
};

export const searchStore = create<SearchStore>((set) => ({
  searchString: '',
  setSearchString: (value: string) =>
    set((store) => ({ ...store, searchString: value })),
}));

/** hook used for setting the search state, syncing with URL and text bar **/
export const useSearch = () => {
  const pathname = usePathname();
  const router = useRouter();
  const posthog = usePostHog();

  const { searchString, setSearchString } = searchStore();
  const [searchResults, setSearchResults] = useState<FuzzySearchResult[]>([]);

  const { openEntitySidePanel: openProjectPanel } = useEntitySidePanel(
    EntityType.Project,
  );
  const { openEntitySidePanel: openOrbitChainPanel } = useEntitySidePanel(
    EntityType.OrbitChain,
  );

  const isSearchPage: boolean = pathname.indexOf('/search/') > -1;

  const searchStringInUrl = useMemo(() => {
    return isSearchPage
      ? decodeURIComponent(pathname.split('/search/')?.[1] || '')
      : '';
  }, [isSearchPage, pathname]);

  useEffect(() => {
    setSearchString(searchStringInUrl);
  }, [searchStringInUrl, setSearchString]);

  useEffect(() => {
    setSearchResults(getSearchResults(searchString));
  }, [searchString]);

  const captureSearchResultClickAnalytics = useCallback(
    (item: { entityType: EntityType; title: string; slug: string }) => {
      const { entityType, title } = item;
      posthog?.capture('Search Queries', {
        'Group Click': entityType,
      });
      posthog?.capture('Search Queries', {
        [`${entityType} Search Click`]: title,
      });
    },
    [posthog],
  );

  // function which handles clicking on any search result, used commonly
  const handleSearchResultSelection = useCallback(
    (
      item: { entityType: EntityType; title: string; slug: string },
      successCallback?: () => void,
    ): void => {
      const { entityType, slug } = item;

      if (entityType === EntityType.Project) {
        openProjectPanel(slug);
      }

      if (entityType === EntityType.OrbitChain) {
        openOrbitChainPanel(slug);
      }

      if (entityType === EntityType.Category) {
        router.push(`/projects/${slug}`, { scroll: true });
      }

      if (entityType === EntityType.Subcategory) {
        const subcategory = slug;
        router.push(`/projects/?subcategories=${subcategory}`, {
          scroll: true,
        });
      }

      captureSearchResultClickAnalytics(item);

      successCallback?.();
    },
    [
      router,
      openProjectPanel,
      openOrbitChainPanel,
      captureSearchResultClickAnalytics,
    ],
  );

  return {
    isSearchPage,
    searchString,
    searchResults,
    setSearchString,
    searchStringInUrl,
    handleSearchResultSelection,
  };
};

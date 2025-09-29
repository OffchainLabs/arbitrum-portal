'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { EntityType } from '@/common/types';
import { ENTITY_METADATA } from '@/common/entities';

/**
 * TEMPORARY WORKAROUND
 * - to avoid resetting the window scroll position when query-params change
 * - we make use of router.push with {scroll:false} to make sure scroll position doesn't change
 * - this is an existing issue in use-query-params in APP ROUTER
 * - NextJS : https://github.com/vercel/next.js/issues/49087
 * - use-query-params : https://github.com/pbeshai/use-query-params/issues/267
 */

export const useEntitySidePanel = (entityType: EntityType) => {
  const router = useRouter();

  const openEntitySidePanel = useCallback(
    (entitySlug: string) => {
      const queryParamKey = ENTITY_METADATA[entityType].queryParamKey;

      if (!queryParamKey) return; // entity doesn't support a side-panel

      const sanitizedUrl = window.location.href.split('#')[0];
      const baseUrl = sanitizedUrl?.split('?')[0];
      const queryParams = new URLSearchParams(sanitizedUrl?.split('?')[1]);

      queryParams.set(queryParamKey, entitySlug);
      const newURL = `${baseUrl}?${queryParams.toString()}`;
      router.push(newURL, { scroll: false });
    },
    [router, entityType],
  );
  const closeEntitySidePanel = useCallback(() => {
    const queryParamKey = ENTITY_METADATA[entityType].queryParamKey;

    if (!queryParamKey) return; // entity doesn't support a side-panel

    const sanitizedUrl = window.location.href.split('#')[0];
    const baseUrl = sanitizedUrl?.split('?')[0];
    const queryParams = new URLSearchParams(sanitizedUrl?.split('?')[1]);

    queryParams.delete(queryParamKey);
    const newURL = `${baseUrl}?${queryParams.toString()}`;
    router.push(newURL, { scroll: false });
  }, [router, entityType]);

  return {
    openEntitySidePanel,
    closeEntitySidePanel,
  };
};

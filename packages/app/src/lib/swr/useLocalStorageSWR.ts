import { useEffect, useRef } from 'react';
import useSWR, { type SWRConfiguration, type SWRResponse, unstable_serialize } from 'swr';

const CACHE_PREFIX = 'arbitrum:earn';

/** Bump when Earn API response shape changes (e.g. nested StandardOpportunity); busts stale cache. */
export const EARN_API_CACHE_SCHEMA_VERSION = 'no-vendordata-v1';

/**
 * Normalize cache keys - use SWR's own serializer to match SWR cache keys exactly
 * This ensures localStorage keys match SWR cache keys for proper cache synchronization
 * Uses unstable_serialize from SWR to ensure exact key format matching (preserves full addresses)
 */
export function normalizeCacheKey(key: string | readonly unknown[]): string {
  return unstable_serialize(key);
}

export function getLocalStorageKey(key: string | readonly unknown[]): string {
  const normalizedKey = normalizeCacheKey(key);
  return `${CACHE_PREFIX}:${normalizedKey}`;
}

function getCurrentUTCTimestamp(): number {
  return Date.now();
}

export function getFromLocalStorage<T>(key: string | readonly unknown[]): T | undefined {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return undefined;
  }

  try {
    const storageKey = getLocalStorageKey(key);
    const item = localStorage.getItem(storageKey);
    if (!item) {
      return undefined;
    }

    const parsed = JSON.parse(item);
    const now = getCurrentUTCTimestamp();
    if (parsed.expiresAt && now > parsed.expiresAt) {
      localStorage.removeItem(storageKey);
      return undefined;
    }

    return parsed.data as T;
  } catch (error) {
    console.error('[LocalStorage SWR] Error reading from localStorage:', error);
    return undefined;
  }
}

export function saveToLocalStorage<T>(
  key: string | readonly unknown[],
  data: T,
  expiresAt?: number,
): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    const storageKey = getLocalStorageKey(key);
    const now = getCurrentUTCTimestamp();
    const entry = {
      data,
      timestamp: now,
      expiresAt: expiresAt ?? Number.MAX_SAFE_INTEGER,
    };

    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch (error) {
    console.error('[LocalStorage SWR] Error writing to localStorage:', error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[LocalStorage SWR] Quota exceeded, clearing old entries');
    }
  }
}

export function useLocalStorageSWR<T, E = Error>(
  key: string | readonly unknown[] | null,
  fetcher: ((key: string | readonly unknown[]) => Promise<T>) | null,
  config?: SWRConfiguration<T, E>,
): SWRResponse<T, E> {
  const fallbackData = key ? getFromLocalStorage<T>(key) : undefined;

  const swrResponse = useSWR<T, E>(key, fetcher, {
    ...config,
    fallbackData: config?.fallbackData ?? fallbackData,
    revalidateOnMount: config?.revalidateOnMount ?? (fallbackData ? false : true),
  });

  const prevDataRef = useRef<T | undefined>(swrResponse.data);

  useEffect(() => {
    if (key && swrResponse.data !== undefined && !swrResponse.isLoading) {
      if (prevDataRef.current !== swrResponse.data) {
        const expiration =
          typeof config?.refreshInterval === 'number'
            ? config.refreshInterval
            : Number.MAX_SAFE_INTEGER;
        const now = getCurrentUTCTimestamp();
        const expiresAt =
          expiration === Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : now + expiration;
        saveToLocalStorage(key, swrResponse.data, expiresAt);
        prevDataRef.current = swrResponse.data;
      }
    }
  }, [key, swrResponse.data, swrResponse.isLoading, config?.refreshInterval]);

  return swrResponse;
}

export function invalidateEarnCache(predicate: (normalizedKey: string) => boolean): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const normalizedKey = key.replace(`${CACHE_PREFIX}:`, '');
        if (predicate(normalizedKey)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('[LocalStorage SWR] Error invalidating cache:', error);
  }
}

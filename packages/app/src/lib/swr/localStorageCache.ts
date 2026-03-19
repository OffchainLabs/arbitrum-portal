import type { Cache } from 'swr';

const LOCAL_STORAGE_CACHE_KEY = 'arbitrum:earn-historical-cache';
const MAX_CACHE_ENTRIES = 500;
const HISTORICAL_KEY_HINT = 'historical-data';
let cacheMap: Map<string, unknown> | null = null;
let listenersRegistered = false;

function isHistoricalCacheKey(key: unknown): key is string {
  return typeof key === 'string' && key.includes(HISTORICAL_KEY_HINT);
}

function getPersistableEntries(map: Map<string, unknown>): Array<[string, unknown]> {
  return Array.from(map.entries())
    .filter(([key]) => isHistoricalCacheKey(key))
    .slice(-MAX_CACHE_ENTRIES);
}

function persistCache() {
  if (!cacheMap || typeof window === 'undefined') {
    return;
  }

  const entries = getPersistableEntries(cacheMap);

  if (entries.length === 0) {
    localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
    return;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(entries));
  } catch {
    localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
  }
}

function parseStoredEntries(rawValue: string | null): Array<[string, unknown]> {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is [string, unknown] =>
        Array.isArray(entry) && entry.length === 2 && isHistoricalCacheKey(entry[0]),
    );
  } catch {
    return [];
  }
}

export function localStorageProvider(): Cache {
  if (typeof window === 'undefined') {
    return new Map() as Cache;
  }

  if (cacheMap) {
    return cacheMap as Cache;
  }

  const parsedEntries = parseStoredEntries(localStorage.getItem(LOCAL_STORAGE_CACHE_KEY));
  cacheMap = new Map<string, unknown>(parsedEntries);

  if (!listenersRegistered) {
    window.addEventListener('beforeunload', persistCache);
    window.addEventListener('pagehide', persistCache);
    listenersRegistered = true;
  }

  return cacheMap as Cache;
}

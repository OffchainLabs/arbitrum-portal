// Measures the SWR keys of the render profile. SWR serializes the key of every hook on every render,
// so a key holding a token list costs as much as the list on each render. SWR also never removes
// a key from its cache, so a key that changes on every refresh grows memory.
import { type Cache, type Key, type Middleware, unstable_serialize } from 'swr';

export type SwrKeyStats = {
  // Key characters serialized on render, by the identifier at the end of the key
  serializedByKey: { [identifier: string]: number };
  cacheEntries: number;
  cacheKeyLength: number;
};

let serializedByKey: { [identifier: string]: number } | undefined;
const caches = new Set<Cache>();

// Keys end with an identifier string, see CLAUDE.md
function getIdentifier(key: Key, serialized: string) {
  if (Array.isArray(key) && typeof key.at(-1) === 'string') {
    return key.at(-1) as string;
  }
  const [path = serialized] = serialized.split('?');
  return path.slice(0, 60);
}

export const swrKeyProfiler: Middleware = (useSWRNext) => (key, fetcher, config) => {
  caches.add((config as { cache: Cache }).cache);
  if (serializedByKey) {
    const serialized = unstable_serialize(key);
    if (serialized) {
      const identifier = getIdentifier(key, serialized);
      serializedByKey[identifier] = (serializedByKey[identifier] ?? 0) + serialized.length;
    }
  }
  return useSWRNext(key, fetcher, config);
};

export async function recordSwrKeys(interaction: () => Promise<void>): Promise<SwrKeyStats> {
  serializedByKey = {};
  try {
    await interaction();
    const keys = [...caches].flatMap((cache) => [...cache.keys()]);
    return {
      serializedByKey,
      cacheEntries: keys.length,
      cacheKeyLength: keys.reduce((total, key) => total + key.length, 0),
    };
  } finally {
    serializedByKey = undefined;
  }
}

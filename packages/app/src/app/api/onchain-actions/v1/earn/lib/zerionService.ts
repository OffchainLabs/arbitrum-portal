// Zerion price service. Docs: https://developers.zerion.io/reference
import { parseFiniteNumber } from '@/app-lib/earn/utils';

import type { HistoricalGranularity, HistoricalTimeRange } from '../types';
import { alignTimestampToGranularity, getGranularityBucketSeconds } from './historicalWindow';
import {
  type ZerionPriceLookup,
  getZerionLookupCacheKey,
  getZerionPriceLookup,
} from './zerionPriceSources';

const ZERION_API_BASE_URL = 'https://api.zerion.io/v1';
const ZERION_REQUEST_TIMEOUT_MS = 10_000;
const CURRENT_PRICE_REVALIDATE_SECONDS = 30 * 60;
const ZERION_BATCH_SIZE = 25;

type ZerionChartPeriod = 'hour' | 'day' | 'week' | 'month' | '3months' | '6months' | 'year';

type ZerionImplementation = { chain_id?: string; address?: string | null };

type ZerionFungibleAttributes = {
  symbol?: string;
  name?: string;
  market_data?: { price?: number | null };
  implementations?: ZerionImplementation[];
};

type ZerionFungibleListResponse = {
  data?: Array<{ id?: string; attributes?: ZerionFungibleAttributes }>;
};

type ZerionChartResponse = {
  data?: { attributes?: { points?: Array<[number, number]> } };
};

function getZerionApiKey(): string {
  const key = process.env.ZERION_API_KEY;
  if (!key) {
    throw new Error('ZERION_API_KEY environment variable is not set');
  }
  return key;
}

function getZerionHeaders(): HeadersInit {
  const auth = Buffer.from(`${getZerionApiKey()}:`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function chunk<T>(values: T[], size: number): T[][] {
  if (values.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) chunks.push(values.slice(i, i + size));
  return chunks;
}

function getZerionChartPeriod(range: HistoricalTimeRange): ZerionChartPeriod {
  if (range === '1d') return 'day';
  if (range === '7d') return 'week';
  if (range === '1m') return 'month';
  return 'year';
}

function getRevalidateSecondsForPeriod(period: ZerionChartPeriod): number {
  if (period === 'day') return 3600;
  if (period === 'week') return 6 * 3600;
  return 86400;
}

type FetchFn = typeof globalThis.fetch;

// Returns a Map keyed by `getZerionLookupCacheKey`. Missing entries map to null.
export async function fetchZerionCurrentPrices(
  lookups: ZerionPriceLookup[],
  fetchFn: FetchFn = globalThis.fetch,
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  if (lookups.length === 0) return result;

  for (const lookup of lookups) {
    result.set(getZerionLookupCacheKey(lookup), null);
  }

  const implementations: string[] = [];
  const fungibleIds: string[] = [];
  const lookupByImplKey = new Map<string, ZerionPriceLookup>();
  const lookupByFungibleId = new Map<string, ZerionPriceLookup>();

  for (const lookup of lookups) {
    if (lookup.kind === 'implementation') {
      implementations.push(lookup.implementation);
      lookupByImplKey.set(lookup.implementation, lookup);
    } else {
      fungibleIds.push(lookup.fungibleId);
      lookupByFungibleId.set(lookup.fungibleId, lookup);
    }
  }

  const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
    method: 'GET',
    headers: getZerionHeaders(),
    signal: AbortSignal.timeout(ZERION_REQUEST_TIMEOUT_MS),
    next: { revalidate: CURRENT_PRICE_REVALIDATE_SECONDS },
  };

  const requests: Promise<void>[] = [];

  for (const implChunk of chunk(Array.from(new Set(implementations)), ZERION_BATCH_SIZE)) {
    const url = new URL(`${ZERION_API_BASE_URL}/fungibles/`);
    url.searchParams.set('filter[fungible_implementations]', implChunk.join(','));
    url.searchParams.set('currency', 'usd');
    url.searchParams.set('page[size]', String(ZERION_BATCH_SIZE));

    requests.push(
      fetchFn(url.toString(), fetchOptions).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Zerion fungibles list (impl) ${res.status} ${res.statusText}`);
        }
        const payload = (await res.json()) as ZerionFungibleListResponse;
        for (const item of payload.data ?? []) {
          const price = parseFiniteNumber(item.attributes?.market_data?.price);
          for (const impl of item.attributes?.implementations ?? []) {
            const candidate = `${impl.chain_id}:${(impl.address ?? '').toLowerCase()}`;
            const requested = lookupByImplKey.get(candidate);
            if (requested) {
              result.set(getZerionLookupCacheKey(requested), price);
            }
          }
        }
      }),
    );
  }

  for (const idChunk of chunk(Array.from(new Set(fungibleIds)), ZERION_BATCH_SIZE)) {
    const url = new URL(`${ZERION_API_BASE_URL}/fungibles/`);
    url.searchParams.set('filter[fungible_ids]', idChunk.join(','));
    url.searchParams.set('currency', 'usd');
    url.searchParams.set('page[size]', String(ZERION_BATCH_SIZE));

    requests.push(
      fetchFn(url.toString(), fetchOptions).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Zerion fungibles list (id) ${res.status} ${res.statusText}`);
        }
        const payload = (await res.json()) as ZerionFungibleListResponse;
        for (const item of payload.data ?? []) {
          if (!item.id) continue;
          const requested = lookupByFungibleId.get(item.id);
          if (requested) {
            const price = parseFiniteNumber(item.attributes?.market_data?.price);
            result.set(getZerionLookupCacheKey(requested), price);
          }
        }
      }),
    );
  }

  const settled = await Promise.allSettled(requests);
  for (const outcome of settled) {
    if (outcome.status === 'rejected') {
      console.warn('[earn][zerion] batched price fetch failed:', getErrorMessage(outcome.reason));
    }
  }

  return result;
}

export async function fetchZerionCurrentPriceByAddress(
  params: {
    chainId: number;
    tokenAddress?: string | null;
    assetSymbol?: string | null;
  },
  fetchFn: FetchFn = globalThis.fetch,
): Promise<number | null> {
  const lookup = getZerionPriceLookup(params);
  if (!lookup) return null;

  try {
    const map = await fetchZerionCurrentPrices([lookup], fetchFn);
    return map.get(getZerionLookupCacheKey(lookup)) ?? null;
  } catch (error) {
    console.warn(
      `[earn][zerion] current price failed for ${params.tokenAddress ?? params.assetSymbol}: ${getErrorMessage(error)}`,
    );
    return null;
  }
}

async function fetchZerionChart(
  lookup: ZerionPriceLookup,
  period: ZerionChartPeriod,
  revalidateSeconds: number,
  fetchFn: FetchFn,
): Promise<Array<[number, number]>> {
  const url =
    lookup.kind === 'implementation'
      ? new URL(`${ZERION_API_BASE_URL}/fungibles/by-implementation/charts/${period}`)
      : new URL(
          `${ZERION_API_BASE_URL}/fungibles/${encodeURIComponent(lookup.fungibleId)}/charts/${period}`,
        );

  if (lookup.kind === 'implementation') {
    url.searchParams.set('implementation', lookup.implementation);
  }
  url.searchParams.set('currency', 'usd');

  const res = await fetchFn(url.toString(), {
    method: 'GET',
    headers: getZerionHeaders(),
    signal: AbortSignal.timeout(ZERION_REQUEST_TIMEOUT_MS),
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`Zerion chart ${period} ${res.status} ${res.statusText}`);
  }
  const payload = (await res.json()) as ZerionChartResponse;
  return payload.data?.attributes?.points ?? [];
}

// Returns a `(timestamp) => price | null` resolver aligned to our granularity.
// Resolver returns null if the asset has no Zerion mapping or the chart fetch fails.
export async function fetchAlignedPriceLookup(
  params: {
    chainId: number;
    tokenAddress?: string | null;
    assetSymbol?: string | null;
    granularity: HistoricalGranularity;
    range: HistoricalTimeRange;
  },
  fetchFn: FetchFn = globalThis.fetch,
): Promise<(timestamp: number) => number | null> {
  const lookup = getZerionPriceLookup({
    chainId: params.chainId,
    tokenAddress: params.tokenAddress,
    assetSymbol: params.assetSymbol,
  });

  if (!lookup) {
    return () => null;
  }

  const period = getZerionChartPeriod(params.range);
  const revalidate = getRevalidateSecondsForPeriod(period);

  let points: Array<[number, number]>;
  try {
    points = await fetchZerionChart(lookup, period, revalidate, fetchFn);
  } catch (error) {
    console.warn(
      `[earn][zerion] chart fetch failed for ${params.tokenAddress ?? params.assetSymbol}: ${getErrorMessage(error)}`,
    );
    return () => null;
  }

  if (points.length === 0) {
    return () => null;
  }

  const bucketSeconds = getGranularityBucketSeconds(params.granularity);
  const priceByBucket = new Map<number, number>();
  for (const [ts, price] of points) {
    if (!Number.isFinite(ts) || !Number.isFinite(price)) continue;
    const bucket = Math.floor(ts / bucketSeconds) * bucketSeconds;
    priceByBucket.set(bucket, price);
  }

  if (priceByBucket.size === 0) {
    return () => null;
  }

  const sortedBuckets = Array.from(priceByBucket.keys()).sort((a, b) => a - b);

  return (timestamp: number): number | null => {
    const wanted = alignTimestampToGranularity(timestamp, params.granularity);
    const direct = priceByBucket.get(wanted);
    if (direct !== undefined) return direct;
    // Step semantics: fall back to nearest earlier bucket so missing points
    // hold the last known price instead of dropping to null.
    let best: number | null = null;
    for (const bucket of sortedBuckets) {
      if (bucket > wanted) break;
      const price = priceByBucket.get(bucket);
      if (price !== undefined) best = price;
    }
    return best;
  };
}

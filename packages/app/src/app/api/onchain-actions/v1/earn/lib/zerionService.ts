import { HISTORICAL_VENDOR_TTL_SECONDS, type HistoricalTimeRange } from '../types';

const ZERION_API_BASE_URL = 'https://api.zerion.io/v1';
const ZERION_REQUEST_TIMEOUT_MS = 10_000;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

function getZerionApiKey(): string {
  const serverApiKey = process.env.ZERION_API_KEY;
  if (serverApiKey) {
    return serverApiKey;
  }

  const legacyPublicApiKey = process.env.NEXT_PUBLIC_ZERION_API_KEY;
  if (legacyPublicApiKey) {
    return legacyPublicApiKey;
  }

  throw new Error(
    'ZERION_API_KEY environment variable is not set (legacy NEXT_PUBLIC_ZERION_API_KEY is also missing)',
  );
}

function getZerionHeaders(): HeadersInit {
  const apiKey = getZerionApiKey();

  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

type ZerionChartTuple = [number, number];

interface ZerionChartResponse {
  data?: {
    type?: string;
    id?: string;
    attributes?: {
      begin_at?: string;
      end_at?: string;
      points?: ZerionChartTuple[];
      stats?: {
        first?: number;
        min?: number;
        avg?: number;
        max?: number;
        last?: number;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  links?: { self?: string };
  [key: string]: unknown;
}

function withTimeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

function getZerionChartUrl(fungibleId: string, chartPeriod: string): URL {
  const encodedFungibleId = encodeURIComponent(fungibleId);
  const encodedChartPeriod = encodeURIComponent(chartPeriod);
  const url = new URL(
    `${ZERION_API_BASE_URL}/fungibles/${encodedFungibleId}/charts/${encodedChartPeriod}`,
  );
  url.searchParams.set('currency', 'usd');
  return url;
}

async function fetchZerionHistoricalPriceForPeriod(
  fungibleId: string,
  chartPeriod: string,
  bucketSeconds: number,
): Promise<Array<{ timestamp: number; price: number }>> {
  const headers = getZerionHeaders();
  const url = getZerionChartUrl(fungibleId, chartPeriod);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    signal: withTimeoutSignal(ZERION_REQUEST_TIMEOUT_MS),
    next: {
      revalidate: HISTORICAL_VENDOR_TTL_SECONDS,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Zerion charts request failed for fungibleId=${fungibleId}, period=${chartPeriod}: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  const data: ZerionChartResponse = await response.json();

  let chartTuples: ZerionChartTuple[] = [];

  if (data.data?.attributes?.points && Array.isArray(data.data.attributes.points)) {
    chartTuples = data.data.attributes.points;
  }

  if (chartTuples.length === 0) {
    return [];
  }

  const transformed = chartTuples
    .map((tuple) => {
      const [timestamp, price] = tuple;
      if (typeof timestamp !== 'number' || typeof price !== 'number') {
        return null;
      }
      return { timestamp, price };
    })
    .filter((point): point is { timestamp: number; price: number } => point !== null);

  transformed.sort((a, b) => a.timestamp - b.timestamp);

  const priceByBucket = new Map<number, { timestamp: number; price: number }>();
  for (const point of transformed) {
    const bucketTimestamp = Math.floor(point.timestamp / bucketSeconds) * bucketSeconds;
    const existing = priceByBucket.get(bucketTimestamp);
    if (!existing || point.timestamp > existing.timestamp) {
      priceByBucket.set(bucketTimestamp, { timestamp: point.timestamp, price: point.price });
    }
  }

  return Array.from(priceByBucket.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export async function fetchZerionHistoricalPrice(
  fungibleId: string,
): Promise<Array<{ timestamp: number; price: number }>> {
  const prices = await fetchZerionHistoricalPriceForPeriod(fungibleId, 'week', SECONDS_PER_DAY);
  return prices.slice(-7);
}

export async function fetchZerionCurrentPrice(fungibleId: string): Promise<number | null> {
  const historical = await fetchZerionHistoricalPrice(fungibleId);

  if (historical.length === 0) {
    return null;
  }

  const latest = historical[historical.length - 1];
  if (!latest) {
    return null;
  }

  return latest.price;
}

export async function fetchZerionPriceAligned(
  fungibleId: string,
  range: HistoricalTimeRange,
): Promise<Map<number, number | null>> {
  const chartPeriodByRange: Record<HistoricalTimeRange, string> = {
    '1d': 'day',
    '7d': 'week',
    '1m': 'month',
    '1y': 'year',
  };

  const chartPeriod = chartPeriodByRange[range] ?? 'week';
  const bucketSeconds = range === '1d' ? SECONDS_PER_HOUR : SECONDS_PER_DAY;
  const priceData = await fetchZerionHistoricalPriceForPeriod(
    fungibleId,
    chartPeriod,
    bucketSeconds,
  );

  const priceMap = new Map<number, number | null>();

  if (priceData.length === 0) {
    return priceMap;
  }

  for (const point of priceData) {
    const bucketTimestamp = Math.floor(point.timestamp / bucketSeconds) * bucketSeconds;
    priceMap.set(bucketTimestamp, point.price);
  }

  return priceMap;
}

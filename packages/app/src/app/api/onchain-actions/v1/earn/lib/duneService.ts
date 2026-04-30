/**
 * Dune Analytics Service
 *
 * Fetches APY and TVL time series from Dune Analytics public dashboard
 * queries for liquid staking opportunities (wstETH, weETH).
 *
 * Pricing has moved to Zerion — see zerionService.ts. This file no longer
 * touches Dune Sim or token-info endpoints.
 */

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type DuneResultsResponse = {
  result?: {
    rows?: Array<Record<string, unknown>>;
  };
};

async function fetchLatestDuneRows(queryId: number): Promise<Array<Record<string, unknown>>> {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) {
    throw new Error('DUNE_API_KEY environment variable is not set');
  }

  const response = await fetch(`https://api.dune.com/api/v1/query/${queryId}/results`, {
    method: 'GET',
    headers: {
      'X-Dune-API-Key': apiKey,
    },
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    throw new Error(`Dune API request failed (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as DuneResultsResponse;
  return payload.result?.rows ?? [];
}

type DuneDataPoint = { timestamp: number; apy: number | null; tvl: number | null };

/**
 * Find the first column in `columns` that matches one of the `matchers` (tried in priority order).
 * Each matcher receives the lowercased column name.
 */
function findColumn(
  columns: string[],
  ...matchers: Array<(name: string) => boolean>
): string | undefined {
  for (const match of matchers) {
    const found = columns.find((col) => match(col.toLowerCase()));
    if (found) return found;
  }
  return undefined;
}

/** APY columns that are already expressed as percentages (not decimals). */
const PERCENTAGE_APY_MATCHERS: Array<(name: string) => boolean> = [
  (n) => n === 'lido staking apr (instant)' || n === 'lido staking apr(instant)',
  (n) => n === 'steth apy',
];

function trimToLookback(data: DuneDataPoint[], lookbackDays: number): DuneDataPoint[] {
  if (data.length === 0) return [];
  const latestTimestamp = data[data.length - 1]?.timestamp;
  if (!latestTimestamp) return [];
  const fromTimestamp = latestTimestamp - lookbackDays * 86400;
  return data.filter((point) => point.timestamp >= fromTimestamp);
}

function findLatestValues(data: DuneDataPoint[]): { apy: number | null; tvl: number | null } {
  let apy: number | null = null;
  let tvl: number | null = null;
  for (let i = data.length - 1; i >= 0; i--) {
    const point = data[i]!;
    if (apy === null) apy = point.apy;
    if (tvl === null) tvl = point.tvl;
    if (apy !== null && tvl !== null) break;
  }
  return { apy, tvl };
}

/**
 * Transform Dune query results to standardized format.
 * Handles different column name variations from different queries.
 */
function transformDuneResults(rows: Array<Record<string, unknown>>): DuneDataPoint[] {
  const firstRow = rows[0];
  if (!firstRow) return [];

  const allColumns = Object.keys(firstRow);

  const timestampColumn = findColumn(
    allColumns,
    (n) => n === 'day' || n === 'block_day' || n === 'time',
    (n) => n.includes('timestamp') || n.includes('date'),
  );
  if (!timestampColumn) return [];

  const apyColumn = findColumn(
    allColumns,
    // wstETH new query (already percentage)
    (n) => n === 'lido staking apr (instant)' || n === 'lido staking apr(instant)',
    // wstETH old query (already percentage)
    (n) => n === 'steth apy',
    // weETH (decimal format)
    (n) => n === 'avg_7day_apr' || n === 'daily_apr',
    // Generic fallback
    (n) => n.includes('apy') || n.includes('apr') || n.includes('yield'),
  );

  const apyIsPercentage = apyColumn
    ? PERCENTAGE_APY_MATCHERS.some((match) => match(apyColumn.toLowerCase()))
    : false;

  const tvlColumn = findColumn(
    allColumns,
    (n) => n === 'tvl',
    (n) => n === 'token_supply_usd',
    (n) => n === 'total_tvl',
    (n) => n === 'cum_deposit',
    (n) => n.includes('total_value') || n.includes('value_locked') || n.includes('total_deposit'),
  );

  return rows
    .map((row) => {
      // Extract timestamp (handle different formats)
      let timestamp: number;
      const tsValue = row[timestampColumn];
      if (typeof tsValue === 'string') {
        const parsedDate = new Date(tsValue);
        if (isNaN(parsedDate.getTime())) return null;
        timestamp = Math.floor(parsedDate.getTime() / 1000);
      } else if (typeof tsValue === 'number') {
        timestamp = tsValue > 1e10 ? Math.floor(tsValue / 1000) : tsValue;
      } else {
        return null;
      }

      // Extract APY (may be percentage or decimal)
      let apy: number | null = null;
      if (apyColumn && row[apyColumn] !== null && row[apyColumn] !== undefined) {
        const apyValue = Number(row[apyColumn]);
        if (Number.isFinite(apyValue)) {
          apy = apyIsPercentage || apyValue >= 1 ? apyValue : apyValue * 100;
        }
      }

      // Extract TVL
      let tvl: number | null = null;
      if (tvlColumn && row[tvlColumn] !== null && row[tvlColumn] !== undefined) {
        const tvlValue = Number(row[tvlColumn]);
        if (Number.isFinite(tvlValue)) {
          tvl = tvlValue;
        }
      }

      return { timestamp, apy, tvl };
    })
    .filter((point): point is DuneDataPoint => point !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Fetch historical APY/TVL data from Dune for a specific query.
 * The Dune query typically returns a long history; this helper trims it to a recent window.
 * @param queryId - Dune query ID
 * @param lookbackDays - How many days of history to keep (defaults to 7)
 */
export async function fetchDuneHistoricalData(
  queryId: number,
  lookbackDays = 7,
): Promise<DuneDataPoint[]> {
  try {
    const rows = await fetchLatestDuneRows(queryId);
    return trimToLookback(transformDuneResults(rows), lookbackDays);
  } catch (error) {
    throw new Error(
      `Failed to fetch Dune historical data for query ${queryId}: ${getErrorMessage(error)}`,
    );
  }
}

/**
 * Fetch current APY/TVL from Dune (latest data point)
 */
export async function fetchDuneCurrentData(queryId: number): Promise<{
  apy: number | null;
  tvl: number | null;
}> {
  try {
    const historical = await fetchDuneHistoricalData(queryId);
    return findLatestValues(historical);
  } catch (error) {
    throw new Error(
      `Failed to fetch current Dune data for query ${queryId}: ${getErrorMessage(error)}`,
    );
  }
}

/**
 * Fetch historical APY/TVL data from separate Dune queries and merge by timestamp.
 * Used when APY and TVL come from different queries (e.g., weETH).
 * @param apyQueryId - Dune query ID for APY
 * @param tvlQueryId - Dune query ID for TVL
 * @param lookbackDays - How many days of history to keep (defaults to 7)
 */
export async function fetchDuneHistoricalDataMerged(
  apyQueryId: number,
  tvlQueryId: number,
  lookbackDays = 7,
): Promise<DuneDataPoint[]> {
  const fetchHistoricalDataOrEmpty = async (
    queryId: number,
    metric: 'apy' | 'tvl',
  ): Promise<DuneDataPoint[]> => {
    try {
      return await fetchDuneHistoricalData(queryId, lookbackDays);
    } catch (error) {
      console.warn(
        `[earn][dune] Failed to fetch ${metric} historical data for query ${queryId}: ${getErrorMessage(error)}`,
      );
      return [];
    }
  };

  try {
    const [apyData, tvlData] = await Promise.all([
      fetchHistoricalDataOrEmpty(apyQueryId, 'apy'),
      fetchHistoricalDataOrEmpty(tvlQueryId, 'tvl'),
    ]);

    // Create maps for quick lookup by timestamp (rounded to day for matching)
    const apyMap = new Map<number, number | null>();
    const tvlMap = new Map<number, number | null>();

    for (const point of apyData) {
      const dayTimestamp = Math.floor(point.timestamp / 86400) * 86400;
      apyMap.set(dayTimestamp, point.apy);
    }
    for (const point of tvlData) {
      const dayTimestamp = Math.floor(point.timestamp / 86400) * 86400;
      tvlMap.set(dayTimestamp, point.tvl);
    }

    const allTimestamps = new Set<number>([
      ...Array.from(apyMap.keys()),
      ...Array.from(tvlMap.keys()),
    ]);

    const merged = Array.from(allTimestamps)
      .map((dayTimestamp) => ({
        timestamp: dayTimestamp,
        apy: apyMap.get(dayTimestamp) ?? null,
        tvl: tvlMap.get(dayTimestamp) ?? null,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return trimToLookback(merged, lookbackDays);
  } catch (error) {
    throw new Error(
      `Failed to fetch merged Dune historical data for queries ${apyQueryId}/${tvlQueryId}: ${getErrorMessage(error)}`,
    );
  }
}

/**
 * Fetch current APY/TVL from separate Dune queries and merge
 * Used when APY and TVL come from different queries (e.g., weETH)
 */
export async function fetchDuneCurrentDataMerged(
  apyQueryId: number,
  tvlQueryId: number,
): Promise<{
  apy: number | null;
  tvl: number | null;
}> {
  try {
    const historical = await fetchDuneHistoricalDataMerged(apyQueryId, tvlQueryId);
    return findLatestValues(historical);
  } catch (error) {
    throw new Error(
      `Failed to fetch merged current Dune data for queries ${apyQueryId}/${tvlQueryId}: ${getErrorMessage(error)}`,
    );
  }
}

/**
 * Dune Analytics Service
 *
 * Fetches APY and TVL data from Dune Analytics public dashboard queries.
 */
import { getDunePriceLookup } from './dunePriceSources';
import { alignTimestampToGranularity, getGranularityBucketSeconds } from './historicalWindow';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const DUNE_SIM_API_BASE_URL = 'https://api.sim.dune.com/v1';
const MAX_SIM_HISTORICAL_OFFSETS = 3;
const MAX_SIM_REQUESTS_PER_SOURCE = 3;

const SECONDS_PER_HOUR = 3600;

function getDuneSimApiKey(): string {
  const simApiKey = process.env.DUNE_SIM_API_KEY;
  if (simApiKey) {
    return simApiKey;
  }

  const duneApiKey = process.env.DUNE_API_KEY;
  if (duneApiKey) {
    return duneApiKey;
  }

  throw new Error(
    'DUNE_SIM_API_KEY environment variable is not set (fallback DUNE_API_KEY is also missing)',
  );
}

function parseOptionalFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function chunkValues<T>(values: T[], chunkSize: number): T[][] {
  if (values.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function sampleOffsets(offsets: number[], maxCount: number): number[] {
  if (offsets.length <= maxCount) {
    return offsets;
  }

  const sampled = new Set<number>();
  const lastIndex = offsets.length - 1;
  for (let i = 0; i < maxCount; i += 1) {
    const ratio = maxCount === 1 ? 0 : i / (maxCount - 1);
    const index = Math.round(ratio * lastIndex);
    const value = offsets[index];
    if (value !== undefined) {
      sampled.add(value);
    }
  }

  return Array.from(sampled).sort((a, b) => a - b);
}

type DuneResultsResponse = {
  result?: {
    rows?: Array<Record<string, unknown>>;
  };
};

type DuneSimHistoricalPrice = {
  offset_hours?: number;
  price_usd?: number | string | null;
};

type DuneSimTokenInfo = {
  chain_id?: number;
  address?: string;
  price_usd?: number | string | null;
  historical_prices?: DuneSimHistoricalPrice[];
};

type DuneSimTokenInfoResponse = {
  contract_address?: string;
  tokens?: DuneSimTokenInfo[];
  data?: DuneSimTokenInfo[];
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

async function fetchDuneSimTokenInfo(params: {
  tokenAddress: string;
  chainId: number;
  historicalOffsetsHours?: number[];
}): Promise<DuneSimTokenInfo | null> {
  const apiKey = getDuneSimApiKey();
  const normalizedAddress = params.tokenAddress.toLowerCase();

  const url = new URL(
    `${DUNE_SIM_API_BASE_URL}/evm/token-info/${encodeURIComponent(normalizedAddress)}`,
  );
  url.searchParams.set('chain_ids', String(params.chainId));

  const offsets = (params.historicalOffsetsHours ?? []).filter(
    (offset) => Number.isInteger(offset) && offset > 0,
  );
  if (offsets.length > 0) {
    url.searchParams.set('historical_prices', offsets.join(','));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Sim-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    next: {
      revalidate: 300,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Dune Sim token-info request failed (${response.status} ${response.statusText})`,
    );
  }

  const payload = (await response.json()) as DuneSimTokenInfoResponse;
  const tokenRows = payload.tokens ?? payload.data ?? [];
  const token =
    tokenRows.find((item) => parseOptionalFiniteNumber(item.chain_id) === params.chainId) ??
    tokenRows[0] ??
    null;

  return token;
}

export async function fetchDuneCurrentPriceByAddress(
  tokenAddress: string,
  chainId: number,
): Promise<number | null> {
  try {
    const tokenInfo = await fetchDuneSimTokenInfo({ tokenAddress, chainId });
    return parseOptionalFiniteNumber(tokenInfo?.price_usd);
  } catch (error) {
    console.warn(
      `[earn][dune] Failed to fetch current token price for ${tokenAddress} on chain ${chainId}: ${getErrorMessage(error)}`,
    );
    return null;
  }
}

async function fetchDunePriceAligned(params: {
  tokenAddress: string;
  chainId: number;
  timestamps: number[];
  granularity: '1hour' | '1day' | '1week';
}): Promise<Map<number, number | null>> {
  const { tokenAddress, chainId, timestamps, granularity } = params;

  try {
    const bucketSeconds = getGranularityBucketSeconds(granularity);
    const nowTimestamp = Math.floor(Date.now() / 1000);

    const uniqueBucketTimestamps = Array.from(
      new Set(
        timestamps
          .map((timestamp) => Math.floor(timestamp / bucketSeconds) * bucketSeconds)
          .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0),
      ),
    );

    if (uniqueBucketTimestamps.length === 0) {
      return new Map();
    }

    const hoursAgoByBucket = new Map<number, number>();
    for (const bucketTimestamp of uniqueBucketTimestamps) {
      const hoursAgo = Math.max(0, Math.round((nowTimestamp - bucketTimestamp) / SECONDS_PER_HOUR));
      hoursAgoByBucket.set(bucketTimestamp, hoursAgo);
    }

    const historicalOffsets = Array.from(new Set(Array.from(hoursAgoByBucket.values())))
      .filter((hoursAgo) => hoursAgo > 0)
      .sort((a, b) => a - b);
    const sampledOffsets = sampleOffsets(
      historicalOffsets,
      MAX_SIM_REQUESTS_PER_SOURCE * MAX_SIM_HISTORICAL_OFFSETS,
    );
    const offsetChunks = chunkValues(sampledOffsets, MAX_SIM_HISTORICAL_OFFSETS);

    const tokenInfoResponses = await Promise.all(
      offsetChunks.length > 0
        ? offsetChunks.map((offsetChunk) =>
            fetchDuneSimTokenInfo({
              tokenAddress,
              chainId,
              historicalOffsetsHours: offsetChunk,
            }),
          )
        : [fetchDuneSimTokenInfo({ tokenAddress, chainId })],
    );

    const priceByHoursAgo = new Map<number, number | null>();
    for (const tokenInfo of tokenInfoResponses) {
      if (!tokenInfo) {
        continue;
      }

      if (!priceByHoursAgo.has(0)) {
        priceByHoursAgo.set(0, parseOptionalFiniteNumber(tokenInfo.price_usd));
      }

      for (const historicalPrice of tokenInfo.historical_prices ?? []) {
        const offsetHours = parseOptionalFiniteNumber(historicalPrice.offset_hours);
        if (offsetHours === null || !Number.isInteger(offsetHours) || offsetHours <= 0) {
          continue;
        }
        priceByHoursAgo.set(offsetHours, parseOptionalFiniteNumber(historicalPrice.price_usd));
      }
    }

    const availableOffsets = Array.from(priceByHoursAgo.entries())
      .filter(([, price]) => price !== null)
      .map(([offset]) => offset)
      .sort((a, b) => a - b);

    const alignedPrices = new Map<number, number | null>();
    for (const [bucketTimestamp, hoursAgo] of hoursAgoByBucket) {
      let alignedPrice = priceByHoursAgo.get(hoursAgo) ?? null;
      if (alignedPrice === null && availableOffsets.length > 0) {
        const fallbackOffset = availableOffsets.find((offset) => offset >= hoursAgo);
        if (fallbackOffset !== undefined) {
          alignedPrice = priceByHoursAgo.get(fallbackOffset) ?? null;
        }
      }
      alignedPrices.set(bucketTimestamp, alignedPrice);
    }

    return alignedPrices;
  } catch (error) {
    console.warn(
      `[earn][dune] Failed to fetch aligned token prices for ${tokenAddress} on chain ${chainId}: ${getErrorMessage(error)}`,
    );
    return new Map();
  }
}

/**
 * Transform Dune query results to standardized format
 * Handles different column name variations from different queries
 */
function transformDuneResults(
  rows: Array<Record<string, unknown>>,
): Array<{ timestamp: number; apy: number | null; tvl: number | null }> {
  if (!rows || rows.length === 0) {
    return [];
  }

  // Get column names from first row
  const firstRow = rows[0];
  if (!firstRow) {
    return [];
  }

  // Map column names (queries may have different column names)
  // Common variations: 'date', 'time', 'timestamp', 'day', 'apy', 'apr', 'tvl', 'total_value_locked'
  const columnMap: Record<string, string> = {};
  let apyIsPercentage = false; // Track if APY is already percentage (for wstETH 'stETH APY')
  const allColumns = Object.keys(firstRow);

  // Find timestamp column - prefer 'day', 'block_day', or 'time', fallback to other date fields
  for (const colName of allColumns) {
    const name = colName.toLowerCase();
    if (name === 'day' || name === 'block_day' || name === 'time') {
      columnMap.timestamp = colName;
      break;
    }
  }
  // If not found, look for other date fields
  if (!columnMap.timestamp) {
    for (const colName of allColumns) {
      const name = colName.toLowerCase();
      if (name.includes('timestamp') || name.includes('date')) {
        columnMap.timestamp = colName;
        break;
      }
    }
  }

  // Find APY column - prefer specific columns, fallback to other apr/apy fields
  // Priority: 'Lido staking APR (instant)' (wstETH new query - already percentage), 'stETH APY' (wstETH old query - already percentage), 'avg_7day_apr' (weETH - decimal), 'daily_apr', then others
  for (const colName of allColumns) {
    const name = colName.toLowerCase();
    // wstETH new query uses 'Lido staking APR (instant)' (already percentage, e.g., 2.53664202797352 = 2.54%)
    if (name === 'lido staking apr (instant)' || name === 'lido staking apr(instant)') {
      columnMap.apy = colName;
      apyIsPercentage = true; // Mark that this is already a percentage
      break;
    }
  }
  // If not found, check for old wstETH format
  if (!columnMap.apy) {
    for (const colName of allColumns) {
      const name = colName.toLowerCase();
      // wstETH old query uses 'stETH APY' (already percentage, e.g., 2.64 = 2.64%)
      // Match exactly 'stETH APY' (not 'stETH APY (30d)' or 'stETH APY (7d)')
      if (name === 'steth apy') {
        columnMap.apy = colName;
        apyIsPercentage = true; // Mark that this is already a percentage
        break;
      }
    }
  }
  // If not found, look for weETH format (decimal format)
  if (!columnMap.apy) {
    for (const colName of allColumns) {
      const name = colName.toLowerCase();
      if (name === 'avg_7day_apr' || name === 'daily_apr') {
        columnMap.apy = colName;
        apyIsPercentage = false; // These are decimals
        break;
      }
    }
  }
  // If still not found, look for any apr/apy fields
  if (!columnMap.apy) {
    for (const colName of allColumns) {
      const name = colName.toLowerCase();
      if (name.includes('apy') || name.includes('apr') || name.includes('yield')) {
        columnMap.apy = colName;
        // Default: assume decimal if value < 1, percentage if >= 1
        break;
      }
    }
  }

  // Find TVL column - look for tvl, total_value_locked, token_supply_usd, or similar
  // Priority: 'TVL' (wstETH TVL query), 'token_supply_usd' (weETH TVL query), then other TVL-related columns
  for (const colName of allColumns) {
    const name = colName.toLowerCase();
    if (name === 'tvl') {
      // wstETH TVL query uses this column (exact match)
      columnMap.tvl = colName;
      break;
    }
  }
  // If not found, check for weETH format
  if (!columnMap.tvl) {
    for (const colName of allColumns) {
      const name = colName.toLowerCase();
      if (name === 'token_supply_usd') {
        // weETH TVL query uses this column
        columnMap.tvl = colName;
        break;
      }
    }
  }
  // If not found, look for other TVL-related columns
  if (!columnMap.tvl) {
    for (const colName of allColumns) {
      const name = colName.toLowerCase();
      if (
        name.includes('total_value') ||
        name.includes('value_locked') ||
        name.includes('total_deposit') ||
        name === 'cum_deposit'
      ) {
        columnMap.tvl = colName;
        break;
      }
    }
  }

  const timestampColumn = columnMap.timestamp;
  if (!timestampColumn) {
    // No timestamp column found, cannot process data
    return [];
  }

  return rows
    .map((row) => {
      // Extract timestamp (handle different formats)
      let timestamp: number;
      const tsValue = row[timestampColumn];
      if (typeof tsValue === 'string') {
        // Parse ISO string or other date formats
        // Handle formats like "2025-09-15 12:20:35.000 UTC" or ISO strings
        const parsedDate = new Date(tsValue);
        if (isNaN(parsedDate.getTime())) {
          return null; // Skip invalid rows
        }
        timestamp = Math.floor(parsedDate.getTime() / 1000);
      } else if (typeof tsValue === 'number') {
        // Already a timestamp (seconds or milliseconds)
        timestamp = tsValue > 1e10 ? Math.floor(tsValue / 1000) : tsValue;
      } else {
        return null; // Skip invalid rows
      }

      // Extract APY (may be percentage or decimal)
      // wstETH query: 'stETH APY' is already percentage (2.64 = 2.64%)
      // weETH query: 'avg_7day_apr' or 'daily_apr' is decimal (0.025 = 2.5%)
      let apy: number | null = null;
      if (columnMap.apy && row[columnMap.apy] !== null && row[columnMap.apy] !== undefined) {
        const apyValue = Number(row[columnMap.apy]);
        if (Number.isFinite(apyValue)) {
          if (apyIsPercentage || apyValue >= 1) {
            apy = apyValue;
          } else {
            apy = apyValue * 100;
          }
        }
      }

      // Extract TVL
      let tvl: number | null = null;
      if (columnMap.tvl && row[columnMap.tvl] !== null && row[columnMap.tvl] !== undefined) {
        const tvlValue = Number(row[columnMap.tvl]);
        if (Number.isFinite(tvlValue)) {
          tvl = tvlValue;
        }
      }

      return { timestamp, apy, tvl };
    })
    .filter(
      (point): point is { timestamp: number; apy: number | null; tvl: number | null } =>
        point !== null,
    )
    .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
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
): Promise<
  Array<{
    timestamp: number;
    apy: number | null;
    tvl: number | null;
  }>
> {
  try {
    const rows = await fetchLatestDuneRows(queryId);
    if (rows.length === 0) {
      return [];
    }

    const transformed = transformDuneResults(rows);
    if (transformed.length === 0) {
      return [];
    }

    // Get the latest timestamp from the data (data is sorted ascending)
    const latestTimestamp = transformed[transformed.length - 1]?.timestamp;
    if (!latestTimestamp) {
      return [];
    }

    const lookbackSeconds = lookbackDays * 24 * 60 * 60;
    const fromTimestamp = latestTimestamp - lookbackSeconds;

    // Filter to the requested window relative to the latest data point
    return transformed.filter((point) => point.timestamp >= fromTimestamp);
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
    if (historical.length === 0) {
      return { apy: null, tvl: null };
    }

    const latestApy = [...historical].reverse().find((point) => point.apy !== null)?.apy ?? null;
    const latestTvl = [...historical].reverse().find((point) => point.tvl !== null)?.tvl ?? null;

    return {
      apy: latestApy,
      tvl: latestTvl,
    };
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
): Promise<
  Array<{
    timestamp: number;
    apy: number | null;
    tvl: number | null;
  }>
> {
  const fetchHistoricalDataOrEmpty = async (
    queryId: number,
    metric: 'apy' | 'tvl',
  ): Promise<Array<{ timestamp: number; apy: number | null; tvl: number | null }>> => {
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
    // Fetch both queries in parallel
    const [apyData, tvlData] = await Promise.all([
      fetchHistoricalDataOrEmpty(apyQueryId, 'apy'),
      fetchHistoricalDataOrEmpty(tvlQueryId, 'tvl'),
    ]);

    // Create maps for quick lookup by timestamp (rounded to day for matching)
    const apyMap = new Map<number, number | null>();
    const tvlMap = new Map<number, number | null>();

    // Populate APY map
    for (const point of apyData) {
      const dayTimestamp = Math.floor(point.timestamp / 86400) * 86400; // Round to day
      apyMap.set(dayTimestamp, point.apy);
    }

    // Populate TVL map
    for (const point of tvlData) {
      const dayTimestamp = Math.floor(point.timestamp / 86400) * 86400; // Round to day
      tvlMap.set(dayTimestamp, point.tvl);
    }

    // Get all unique timestamps (from both datasets)
    const allTimestamps = new Set<number>([
      ...Array.from(apyMap.keys()),
      ...Array.from(tvlMap.keys()),
    ]);

    // Merge data points
    const merged = Array.from(allTimestamps)
      .map((dayTimestamp) => ({
        timestamp: dayTimestamp,
        apy: apyMap.get(dayTimestamp) ?? null,
        tvl: tvlMap.get(dayTimestamp) ?? null,
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending

    if (merged.length === 0) {
      return [];
    }

    const latestTimestamp = merged[merged.length - 1]?.timestamp;
    if (!latestTimestamp) {
      return [];
    }

    const lookbackSeconds = lookbackDays * 24 * 60 * 60;
    const fromTimestamp = latestTimestamp - lookbackSeconds;
    return merged.filter((point) => point.timestamp >= fromTimestamp);
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
    if (historical.length === 0) {
      return { apy: null, tvl: null };
    }

    const latestApy = [...historical].reverse().find((point) => point.apy !== null)?.apy ?? null;
    const latestTvl = [...historical].reverse().find((point) => point.tvl !== null)?.tvl ?? null;

    return {
      apy: latestApy,
      tvl: latestTvl,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch merged current Dune data for queries ${apyQueryId}/${tvlQueryId}: ${getErrorMessage(error)}`,
    );
  }
}

/**
 * Build a function that looks up a price for a given timestamp from a
 * bucket-aligned price map.
 */
function createAlignedPriceLookup(
  priceMap: Map<number, number | null>,
  granularity: '1hour' | '1day' | '1week',
): (timestamp: number) => number | null {
  return (timestamp: number) => {
    const bucketTimestamp = alignTimestampToGranularity(timestamp, granularity);
    return priceMap.get(bucketTimestamp) ?? null;
  };
}

/**
 * One-shot helper: resolve the Dune price source for a token, fetch aligned
 * historical prices, and return a lookup function.
 *
 * Combines getDunePriceLookup + fetchDunePriceAligned + createAlignedPriceLookup
 * so adapters only need a single call.
 */
export async function fetchAlignedPriceLookup(params: {
  chainId: number;
  tokenAddress?: string | null;
  assetSymbol?: string | null;
  timestamps: number[];
  granularity: '1hour' | '1day' | '1week';
}): Promise<(timestamp: number) => number | null> {
  const priceLookup = getDunePriceLookup({
    chainId: params.chainId,
    tokenAddress: params.tokenAddress,
    assetSymbol: params.assetSymbol,
  });

  if (!priceLookup) {
    return () => null;
  }

  const priceMap = await fetchDunePriceAligned({
    tokenAddress: priceLookup.tokenAddress,
    chainId: priceLookup.chainId,
    timestamps: params.timestamps,
    granularity: params.granularity,
  });

  return createAlignedPriceLookup(priceMap, params.granularity);
}

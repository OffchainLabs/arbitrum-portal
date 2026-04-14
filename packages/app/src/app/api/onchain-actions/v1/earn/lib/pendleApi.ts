import { ChainId } from '@/bridge/types/ChainId';

import { PENDLE_API_BASE_URL } from './pendle';

async function parsePendleApiError(response: Response): Promise<string> {
  const fallback = `Pendle API error: ${response.status} ${response.statusText}`;
  try {
    const errorData = await response.json();
    return errorData.message || errorData.error || fallback;
  } catch {
    return fallback;
  }
}

export interface PendleTokenMetadata {
  address: string;
  symbol: string;
  icon?: string;
  decimals?: number;
}

export interface PendleMarket {
  name: string;
  address: string;
  expiry: string;
  pt: string;
  yt: string;
  sy: string;
  underlyingAsset: string;
  details: PendleMarketDetails;
  isNew: boolean;
  isPrime: boolean;
  timestamp: string;
  lpWrapper?: string;
  categoryIds: string[];
  chainId: number;
  // Asset metadata (similar to Vaults asset structure)
  ptToken?: PendleTokenMetadata;
  syToken?: PendleTokenMetadata;
}

export interface PendleMarketDetails {
  liquidity?: number;
  totalTvl?: number;
  tradingVolume?: number;
  underlyingApy?: number;
  impliedApy?: number;
  swapFeeApy?: number;
  pendleApy?: number;
  feeRate?: number;
  yieldRange?: {
    min: number;
    max: number;
  };
  totalPt?: number;
  totalSy?: number;
  totalSupply?: number;
  sySupplyCap?: number | null;
  syCurrentSupply?: number;
}

/** Raw market details as returned by Pendle API (fields can be number or { usd }) */
type RawPendleMarketDetails = Omit<
  PendleMarketDetails,
  'liquidity' | 'totalTvl' | 'tradingVolume'
> & {
  liquidity?: number | { usd?: number };
  totalTvl?: number | { usd?: number };
  tradingVolume?: number | { usd?: number };
};

function normalizeNumericField(value: number | { usd?: number } | undefined): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? value : value.usd;
}

function normalizeMarketDetails(raw: RawPendleMarketDetails): PendleMarketDetails {
  return {
    ...raw,
    liquidity: normalizeNumericField(raw.liquidity),
    totalTvl: normalizeNumericField(raw.totalTvl),
    tradingVolume: normalizeNumericField(raw.tradingVolume),
  };
}

/** Lowercase all address fields so downstream code can use === instead of .toLowerCase() */
function normalizeMarket(
  market: Omit<PendleMarket, 'details'> & { details: RawPendleMarketDetails },
): PendleMarket {
  return {
    ...market,
    address: market.address.toLowerCase(),
    pt: market.pt.toLowerCase(),
    yt: market.yt.toLowerCase(),
    sy: market.sy.toLowerCase(),
    underlyingAsset: market.underlyingAsset.toLowerCase(),
    details: normalizeMarketDetails(market.details),
  };
}

export interface PendleMarketsResponse {
  markets: PendleMarket[];
}

const PENDLE_MARKETS_LIMIT = 50;

export async function getPendleMarkets(
  chainId: number = ChainId.ArbitrumOne,
  isActive: boolean = true,
): Promise<PendleMarketsResponse> {
  const url = new URL(`${PENDLE_API_BASE_URL}/v2/markets/all`);
  url.searchParams.set('chainId', chainId.toString());
  url.searchParams.set('limit', PENDLE_MARKETS_LIMIT.toString());
  if (isActive) {
    url.searchParams.set('isActive', 'true');
  }

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(await parsePendleApiError(response));

  const data: { results: (Omit<PendleMarket, 'details'> & { details: RawPendleMarketDetails })[] } =
    await response.json();
  return { markets: data.results.map(normalizeMarket) };
}

export async function getPendleMarketByAddress(
  chainId: number,
  marketAddress: string,
): Promise<PendleMarket | null> {
  const marketId = `${chainId}-${marketAddress}`;
  const url = new URL(`${PENDLE_API_BASE_URL}/v2/markets/all`);
  url.searchParams.set('ids', marketId);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(await parsePendleApiError(response));

  const data: { results: (Omit<PendleMarket, 'details'> & { details: RawPendleMarketDetails })[] } =
    await response.json();
  const market = data.results[0];
  if (!market) return null;
  return normalizeMarket(market);
}

export async function getPendleMarketDetails(
  chainId: number,
  marketAddress: string,
): Promise<PendleMarketDetails> {
  const url = new URL(`${PENDLE_API_BASE_URL}/v2/${chainId}/markets/${marketAddress}/data`);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(await parsePendleApiError(response));

  const raw = await response.json();
  return normalizeMarketDetails(raw);
}

export interface PendleTokenAmount {
  token: string; // Token address or ID
  amount: string; // Amount in raw token units
}

export interface PendleConvertRoute {
  contractParamInfo: unknown; // Contract params info
  tx: {
    to: string;
    data: string;
    value?: string;
  };
  outputs: PendleTokenAmount[]; // Output token amounts
  data: {
    aggregatorType?: string; // Aggregator used (e.g., "KYBERSWAP")
    priceImpact?: number; // Price impact (can be negative)
    amountOut?: string; // Output amount (if present)
    impliedApy?: {
      before: number;
      after: number;
    };
    effectiveApy?: number;
  };
}

export interface PendleRequiredApproval {
  token: string; // Token address or ID (format: "chainId-address" or just "address")
  amount: string; // Amount in raw token units
}

export interface PendleMultiRouteConvertResponse {
  action: string;
  inputs?: PendleTokenAmount[];
  routes: PendleConvertRoute[]; // Array of routes (usually one)
  requiredApprovals?: PendleRequiredApproval[]; // Required token approvals
}

interface PendleConvertRouteParams {
  chainId: number;
  tokensIn: string[];
  amountsIn: string[];
  tokensOut: string[];
  receiver: string;
  slippage?: number;
  enableAggregator?: boolean;
}

/**
 * Fetch Pendle convert route (transaction data for entering/exiting positions)
 */
export async function getPendleConvertRoute({
  chainId,
  tokensIn,
  amountsIn,
  tokensOut,
  receiver,
  slippage = 0.005,
  enableAggregator = true,
}: PendleConvertRouteParams): Promise<PendleMultiRouteConvertResponse> {
  const response = await fetch(`${PENDLE_API_BASE_URL}/v3/sdk/${chainId}/convert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiver,
      slippage,
      enableAggregator,
      inputs: tokensIn.map((token, index) => ({
        token,
        amount: amountsIn[index],
      })),
      outputs: tokensOut,
    }),
  });

  if (!response.ok) throw new Error(await parsePendleApiError(response));

  return response.json();
}

interface PendleMarketHistoricalDataPoint {
  timestamp: number; // Unix timestamp in seconds
  impliedApy?: number; // APY as decimal (e.g., 0.05 = 5%)
  totalTvl?: number; // TVL in USD
  tvl?: number; // TVL in USD (alternative field)
  ptPrice?: number; // PT token price in USD
}

interface PendleMarketHistoricalDataResponse {
  results?: Array<{
    timestamp: string; // ISO timestamp string
    impliedApy?: number;
    tvl?: number;
    totalTvl?: number;
    ptPrice?: number;
  }>;
}

interface PendleMarketHistoricalDataParams {
  chainId: number;
  marketAddress: string;
  timeFrame: 'hour' | 'day' | 'week';
  timestampStart?: string;
  timestampEnd?: string;
}

export async function getPendleMarketHistoricalData({
  chainId,
  marketAddress,
  timeFrame,
  timestampStart,
  timestampEnd,
}: PendleMarketHistoricalDataParams): Promise<PendleMarketHistoricalDataPoint[]> {
  const url = new URL(
    `${PENDLE_API_BASE_URL}/v3/${chainId}/markets/${marketAddress}/historical-data`,
  );
  // Pendle API uses snake_case for query parameters
  url.searchParams.set('time_frame', timeFrame);
  // Request only the fields we need: PT APY (impliedApy), Liquidity (tvl, totalTvl), and PT Price (ptPrice)
  url.searchParams.set('fields', 'timestamp,impliedApy,tvl,totalTvl,ptPrice');
  if (timestampStart) {
    url.searchParams.set('timestamp_start', timestampStart);
  }
  if (timestampEnd) {
    url.searchParams.set('timestamp_end', timestampEnd);
  }

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error(await parsePendleApiError(response));

  const jsonData: PendleMarketHistoricalDataResponse = await response.json();

  // Transform API response: convert ISO timestamps to Unix timestamps
  const transformed = (jsonData.results || []).map((item) => ({
    timestamp: Math.floor(new Date(item.timestamp).getTime() / 1000),
    impliedApy: item.impliedApy,
    tvl: item.tvl,
    totalTvl: item.totalTvl,
    ptPrice: item.ptPrice,
  }));

  return transformed;
}

export interface PendleAsset {
  name: string;
  decimals: number;
  address: string;
  symbol: string;
  tags: string[]; // e.g., ["PT", "YT", "SY", "PENDLE_LP"]
  expiry?: string; // ISO date string (for PT tokens)
  proIcon?: string; // Icon URL
  chainId: number;
}

export interface PendleAssetsResponse {
  assets: PendleAsset[];
}

/**
 * Fetch Pendle assets (PT, YT, SY, LP tokens)
 * @param chainId - Chain ID (defaults to Arbitrum One)
 * @param assetIds - Optional comma-separated list of asset IDs (format: "chainId-address")
 * @param assetType - Optional asset type filter: "PT", "YT", "SY", or "PENDLE_LP". If omitted, fetches all types.
 */
export async function getPendleAssets(
  chainId: number,
  assetIds?: string[],
  assetType?: 'PT' | 'YT' | 'SY' | 'PENDLE_LP',
): Promise<PendleAssetsResponse> {
  const url = new URL(`${PENDLE_API_BASE_URL}/v1/assets/all`);
  url.searchParams.set('chainId', chainId.toString());

  if (assetIds && assetIds.length > 0) {
    url.searchParams.set('ids', assetIds.join(','));
  }

  // Only set type parameter if specified - omitting it fetches all asset types
  if (assetType) {
    url.searchParams.set('type', assetType);
  }

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error(await parsePendleApiError(response));

  return response.json();
}

/**
 * Position in a Pendle market
 */
export interface PendlePosition {
  balance: string; // Balance (in raw token units)
  activeBalance?: string; // Active balance (for LP only)
  valuation: number; // USD value
  claimTokenAmounts?: Array<{
    token: string;
    amount: string;
  }>;
}

/**
 * User position in a Pendle market
 */
interface PendleUserPosition {
  marketId: string; // Market ID (format: "chainId-address")
  pt: PendlePosition; // PT position
  yt: PendlePosition; // YT position
  lp: PendlePosition; // LP position
}

/**
 * User positions response for a single chain
 */
interface PendleUserPositionsResponse {
  chainId: number;
  totalOpen: number;
  totalClosed: number;
  totalSy: number;
  openPositions: PendleUserPosition[];
  closedPositions: PendleUserPosition[];
  syPositions: Array<{
    syId: string;
    balance: string;
    claimTokenAmounts?: Array<{
      token: string;
      amount: string;
    }>;
  }>;
  updatedAt: string;
  errorMessage?: string;
}

/**
 * Cross-chain user positions response
 */
interface PendleUserPositionsCrossChainResponse {
  positions: PendleUserPositionsResponse[];
}

/**
 * Fetch user positions across all Pendle markets
 * @param userAddress - User wallet address
 */
export async function getPendleUserPositions(
  userAddress: string,
): Promise<PendleUserPositionsCrossChainResponse> {
  const url = new URL(`${PENDLE_API_BASE_URL}/v1/dashboard/positions/database/${userAddress}`);

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error(await parsePendleApiError(response));

  return response.json();
}

/**
 * Raw transaction from Pendle API
 */
interface PendleTransactionRaw {
  chainId: number;
  market: string;
  user: string;
  timestamp: string; // ISO timestamp string
  action: string; // e.g., "buyPt", "sellPt", "addLiquidity", etc.
  ptData: {
    unit: number;
    spent_v2: {
      usd: number;
      asset: number;
      eth: number;
    };
  };
  ytData: {
    unit: number;
    spent_v2: {
      usd: number;
      asset: number;
      eth: number;
    };
  };
  lpData: {
    unit: number;
    spent_v2: {
      usd: number;
      asset: number;
      eth: number;
    };
  };
  txValueAsset: number;
  assetUsd: number;
  assetEth: number;
  txHash: string;
}

/**
 * Pendle transaction history types
 */
interface PendleTransaction {
  timestamp: number;
  type: 'enter' | 'exit' | 'add' | 'claim' | 'rollover' | 'other';
  action: string;
  txHash: string;
  market: string;
  chainId: number;
  inputAmount: number;
  outputAmount: number;
  positionSize: {
    amount: number;
    symbol: string;
    usd: number;
  };
}

interface PendleTransactionHistoryResponse {
  transactions: PendleTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Map Pendle action to transaction type
 */
function mapActionToType(action: string): PendleTransaction['type'] {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('buypt')) return 'enter';
  if (actionLower.includes('sellpt')) return 'exit';
  if (actionLower.includes('add') || actionLower.includes('liquidity')) return 'add';
  if (actionLower.includes('claim')) return 'claim';
  if (actionLower.includes('rollover')) return 'rollover';
  return 'other';
}

/**
 * Transform raw transaction to UI format
 */
function transformTransaction(
  raw: PendleTransactionRaw,
  underlyingAssetSymbol: string,
): PendleTransaction {
  const timestamp = Math.floor(new Date(raw.timestamp).getTime() / 1000);
  const type = mapActionToType(raw.action);
  const ptAmount = raw.ptData?.unit || 0;
  const underlyingAmount = raw.txValueAsset || raw.ptData?.spent_v2?.asset || 0;
  const isEnterLike = type === 'enter' || type === 'add';
  const isExitLike = type === 'exit';

  let positionSize: PendleTransaction['positionSize'];
  let inputAmount: number;
  let outputAmount: number;

  if (isEnterLike) {
    positionSize = {
      amount: ptAmount,
      symbol: ptAmount > 0 ? `PT${underlyingAssetSymbol}` : underlyingAssetSymbol,
      usd: ptAmount > 0 ? ptAmount * (raw.assetUsd || 0) : raw.ptData?.spent_v2?.usd || 0,
    };
    inputAmount = underlyingAmount > 0 ? underlyingAmount : ptAmount;
    outputAmount = ptAmount > 0 ? ptAmount : underlyingAmount;
  } else if (isExitLike) {
    positionSize = {
      amount: underlyingAmount > 0 ? underlyingAmount : ptAmount,
      symbol: underlyingAssetSymbol,
      usd:
        underlyingAmount > 0
          ? underlyingAmount * (raw.assetUsd || 0)
          : raw.ptData?.spent_v2?.usd || 0,
    };
    inputAmount = ptAmount > 0 ? ptAmount : underlyingAmount;
    outputAmount = underlyingAmount > 0 ? underlyingAmount : ptAmount;
  } else {
    positionSize = {
      amount: ptAmount > 0 ? ptAmount : underlyingAmount,
      symbol: ptAmount > 0 ? `PT${underlyingAssetSymbol}` : underlyingAssetSymbol,
      usd: ptAmount > 0 ? ptAmount * (raw.assetUsd || 0) : raw.ptData?.spent_v2?.usd || 0,
    };
    inputAmount = ptAmount > 0 ? ptAmount : underlyingAmount;
    outputAmount = underlyingAmount > 0 ? underlyingAmount : ptAmount;
  }

  return {
    timestamp,
    type,
    action: raw.action,
    txHash: raw.txHash,
    market: raw.market,
    chainId: raw.chainId,
    inputAmount,
    outputAmount,
    positionSize,
  };
}

interface PendleTransactionHistoryParams {
  userAddress: string;
  /** When omitted, returns history across all markets */
  marketAddress?: string;
  chainId?: number;
  page?: number;
  pageSize?: number;
  underlyingAssetSymbol?: string;
}

export async function getPendleTransactionHistory({
  userAddress,
  marketAddress,
  chainId = ChainId.ArbitrumOne,
  page = 1,
  pageSize = 50,
  underlyingAssetSymbol = 'Asset',
}: PendleTransactionHistoryParams): Promise<PendleTransactionHistoryResponse> {
  const url = new URL(`${PENDLE_API_BASE_URL}/v1/pnl/transactions`);
  url.searchParams.set('user', userAddress);
  url.searchParams.set('chainId', chainId.toString());
  if (marketAddress) {
    url.searchParams.set('market', marketAddress);
  }
  url.searchParams.set('page', page.toString());
  url.searchParams.set('pageSize', pageSize.toString());

  const response = await fetch(url.toString());

  if (!response.ok) throw new Error(await parsePendleApiError(response));

  const rawData: {
    results?: PendleTransactionRaw[];
    transactions?: PendleTransactionRaw[];
    total?: number;
    page?: number;
    pageSize?: number;
  } = await response.json();

  // Transform raw data
  const resultsArray = rawData.results || rawData.transactions || [];
  const transactions: PendleTransaction[] = resultsArray.map((raw: PendleTransactionRaw) =>
    transformTransaction(raw, underlyingAssetSymbol),
  );

  return {
    transactions,
    total: rawData.total || transactions.length,
    page: rawData.page || page,
    pageSize: rawData.pageSize || pageSize,
  };
}

import type { VaultsSdk } from '@vaultsfyi/sdk';

import { OPPORTUNITY_CATEGORIES, OpportunityCategory } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';

export { OpportunityCategory, OPPORTUNITY_CATEGORIES };

export enum Vendor {
  Vaults = 'vaults',
  LiFi = 'lifi',
  Pendle = 'pendle',
}

export const EARN_NETWORKS = ['arbitrum', 'mainnet'] as const;
export type EarnNetwork = (typeof EARN_NETWORKS)[number];
export const EARN_CHAIN_IDS = [ChainId.ArbitrumOne, ChainId.Ethereum] as const;
export type EarnChainId = (typeof EARN_CHAIN_IDS)[number];
export const DEFAULT_EARN_CHAIN_ID: EarnChainId = ChainId.ArbitrumOne;
export const EARN_NETWORK_TO_CHAIN_ID: Record<EarnNetwork, EarnChainId> = {
  arbitrum: ChainId.ArbitrumOne,
  mainnet: ChainId.Ethereum,
};
export const EARN_CHAIN_ID_TO_NETWORK: Partial<Record<ChainId, EarnNetwork>> = {
  [ChainId.ArbitrumOne]: 'arbitrum',
  [ChainId.Ethereum]: 'mainnet',
};

export function getEarnNetworkFromChainId(chainId: number): EarnNetwork {
  const network = EARN_CHAIN_ID_TO_NETWORK[chainId as ChainId];
  if (!network) {
    throw new Error(`Unsupported chainId for earn network mapping: ${chainId}`);
  }
  return network;
}

export function getEarnChainIdFromNetwork(network: EarnNetwork): EarnChainId {
  return EARN_NETWORK_TO_CHAIN_ID[network];
}
export const EARN_TRANSACTION_ACTIONS = [
  'deposit',
  'redeem',
  'swap',
  'enter',
  'exit',
  'rollover',
  'claim',
] as const;
export type EarnTransactionAction = (typeof EARN_TRANSACTION_ACTIONS)[number];

export interface OpportunityFilters {
  chainId?: EarnChainId;
  minTvl?: number;
  minApy?: number;
  perPage?: number;
}

export interface StandardOpportunityMetrics {
  rawApy: number | null;
  rawTvl: number | null;
  deposited: string | null;
  /** Raw numeric value or null. No $ or locale formatting. */
  depositedUsd: number | null;
  /** Raw numeric value or null. No $ or locale formatting. */
  projectedEarningsUsd: number | null;
  maturityDate?: string;
  apyBreakdown?: { base: number; reward: number; total: number };
}

export interface StandardOpportunityLendDetail {
  protocolName: string;
  networkName: string;
  tvlUsd?: number;
  assetSymbol?: string;
  assetLogo?: string;
  assetAddress?: string;
  protocolLogo?: string;
  description?: string;
  stakersCount?: number;
  apy30day?: number;
  apy7day?: number;
}

export interface StandardOpportunityFixedYieldDetail {
  pt: string;
  detailsTvlUsd: number;
  detailsImpliedApy: number;
  expiry?: string;
  detailsUnderlyingApy?: number;
  detailsLiquidityUsd?: number;
  detailsTradingVolumeUsd?: number;
  ptTokenIcon?: string;
  underlyingAsset?: string;
  sySupplyCap?: number | null;
  syCurrentSupply?: number;
}

export interface StandardOpportunityBase {
  id: string;
  vendor: Vendor;
  chainId: EarnChainId;
  network: string;
  protocol: string;
  token: string;
  vaultAddress: string;
  metrics: StandardOpportunityMetrics;
  name?: string;
  tokenIcon?: string;
  tokenNetwork?: string;
  protocolIcon?: string;
}

export interface StandardOpportunityLend extends StandardOpportunityBase {
  category: typeof OpportunityCategory.Lend;
  lend: StandardOpportunityLendDetail;
}

export interface StandardOpportunityLiquidStaking extends StandardOpportunityBase {
  category: OpportunityCategory.LiquidStaking;
}

export interface StandardOpportunityFixedYield extends StandardOpportunityBase {
  category: OpportunityCategory.FixedYield;
  fixedYield: StandardOpportunityFixedYieldDetail;
}

export type StandardOpportunity =
  | StandardOpportunityLend
  | StandardOpportunityLiquidStaking
  | StandardOpportunityFixedYield;

export type VaultsOpportunity = StandardOpportunityLend & { vendor: Vendor.Vaults };
export type LiFiOpportunity = StandardOpportunityLiquidStaking & { vendor: Vendor.LiFi };
export type PendleOpportunity = StandardOpportunityFixedYield & { vendor: Vendor.Pendle };

// Vendor-specific response types
type VaultsSdkInstance = InstanceType<typeof VaultsSdk>;
export type VaultsTransactionContextResponse = Awaited<
  ReturnType<VaultsSdkInstance['getTransactionsContext']>
>;
export type VaultsActionsResponse = Awaited<ReturnType<VaultsSdkInstance['getActions']>>;
export type VaultsAction = VaultsActionsResponse extends { actions: infer A }
  ? A extends readonly (infer T)[]
    ? T
    : never
  : never;

export interface StandardTokenContextItem {
  decimals: number;
  symbol: string;
  address: string;
  balanceNative?: string;
  balanceUsd?: string;
}

export interface StandardTransactionContext {
  asset: StandardTokenContextItem;
  lpToken: StandardTokenContextItem;
}

export interface AvailableActions {
  opportunityId: string;
  vendor: Vendor;
  userAddress: string;
  availableActions: EarnTransactionAction[];
  transactionContext: StandardTransactionContext | null;
}

export interface TransactionQuoteRequest {
  category: OpportunityCategory;
  action: EarnTransactionAction;
  amount: string;
  userAddress: string;
  inputTokenAddress?: string;
  outputTokenAddress?: string;
  slippage?: number;
  simulate?: boolean;
  rolloverTargetOpportunityId?: string;
  rolloverAmount?: string;
  chainId?: EarnChainId;
}

export interface TransactionStep {
  step: number;
  type: 'approval' | 'transaction';
  to: string;
  data: string;
  value?: string;
  chainId: number;
  description?: string;
}

export interface TransactionQuoteResponse {
  opportunityId: string;
  vendor: Vendor;
  action: TransactionQuoteRequest['action'];
  canExecute: boolean;
  estimatedGas: string;
  estimatedGasUsd: string;
  receiveAmount?: string;
  priceImpact?: number;
  transactionSteps: TransactionStep[];
}

export type LendAvailableActions = AvailableActions & {
  vendor: Vendor.Vaults;
  transactionContext: StandardTransactionContext;
};

export type LiquidStakingAvailableActions = AvailableActions & {
  vendor: Vendor.LiFi;
  transactionContext: null;
};

export type FixedYieldAvailableActions = AvailableActions & {
  vendor: Vendor.Pendle;
  transactionContext: null;
};

export type LendTransactionQuoteResponse = TransactionQuoteResponse & {
  vendor: Vendor.Vaults;
};

export type LiquidStakingTransactionQuoteResponse = TransactionQuoteResponse & {
  vendor: Vendor.LiFi;
};

export type FixedYieldTransactionQuoteResponse = TransactionQuoteResponse & {
  vendor: Vendor.Pendle;
};

export interface HistoricalDataPoint {
  timestamp: number;
  apy: number | null;
  tvl: number | null;
  price: number | null;
}

export type HistoricalTimeRange = '1d' | '7d' | '1m' | '1y';

export type HistoricalGranularity = '1hour' | '1day' | '1week';

export interface HistoricalData {
  data: HistoricalDataPoint[];
  granularity: HistoricalGranularity;
  range: HistoricalTimeRange;
  fromTimestamp: number;
  toTimestamp: number;
  isCached: boolean;
  lastFetchedAt: number;
  expiresAt: number;
}

export const HISTORICAL_VENDOR_TTL_SECONDS = 86400 as const;

export const ALLOWED_HISTORICAL_RANGES: readonly HistoricalTimeRange[] = [
  '1d',
  '7d',
  '1m',
  '1y',
] as const;

export interface StandardUserPosition {
  opportunityId: string;
  category: OpportunityCategory;
  vendor: Vendor;
  network: string;
  amount: string;
  valueUsd: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenIcon?: string;
  projectedEarningsUsd?: number;
  opportunity: {
    id: string;
    name: string;
    protocol: string;
    apy: number;
    tvl?: number;
  };
  isExpired?: boolean;
}

export interface UserPositionsResponse {
  userAddress: string;
  positions: StandardUserPosition[];
  totalValueUsd: number;
  projectedEarningsUsd: number;
  projectedEarningsMonthlyUsd: number;
  projectedEarningsYearlyPercentage: number;
  projectedEarningsMonthlyPercentage: number;
  netApy: number;
  categoryApy: Record<OpportunityCategory, number>;
  summary: {
    byCategory: Record<OpportunityCategory, { count: number; valueUsd: number }>;
    byVendor: Record<string, { count: number; valueUsd: number }>;
  };
  cachedAt?: number;
  expiresAt?: number;
  errors?: Array<{ category: string; error: string }>;
}

export interface StandardTransactionHistory {
  timestamp: number;
  eventType: string;
  assetAmountRaw: string;
  assetSymbol: string;
  decimals?: number;
  assetLogo?: string;
  chainId: number;
  chainName: string;
  transactionHash: string;
}

export interface TransactionHistoryResponse {
  opportunityId: string;
  category: OpportunityCategory;
  vendor: Vendor;
  userAddress: string;
  transactions: StandardTransactionHistory[];
  total: number;
  cachedAt?: number;
  expiresAt?: number;
}

export interface VendorAdapter {
  vendor: Vendor;
  getOpportunities(filters: OpportunityFilters): Promise<StandardOpportunity[]>;
  getOpportunityDetails(id: string, chainId: EarnChainId): Promise<StandardOpportunity>;
  getHistoricalData(
    id: string,
    range: HistoricalTimeRange,
    chainId: EarnChainId,
  ): Promise<HistoricalData>;
  getAvailableActions(
    id: string,
    userAddress: string,
    chainId: EarnChainId,
  ): Promise<AvailableActions>;
  getTransactionQuote(
    id: string,
    request: TransactionQuoteRequest,
    chainId: EarnChainId,
  ): Promise<TransactionQuoteResponse>;
  getUserPositions(userAddress: string, chainId: EarnChainId): Promise<StandardUserPosition[]>;
  getUserTransactions(
    id: string,
    userAddress: string,
    chainId: EarnChainId,
  ): Promise<StandardTransactionHistory[]>;
}

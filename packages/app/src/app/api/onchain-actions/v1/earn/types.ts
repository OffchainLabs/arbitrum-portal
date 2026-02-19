import type { VaultsSdk } from '@vaultsfyi/sdk';

import { OpportunityCategory } from '@/app-types/earn/vaults';

export enum Vendor {
  Vaults = 'vaults',
}

export interface OpportunityFilters {
  network?: string;
  minTvl?: number;
  minApy?: number;
  perPage?: number;
  page?: number;
}

export interface StandardOpportunityMetrics {
  rawApy: number;
  rawTvl: number;
  deposited: string | null;
  /** Raw numeric value or null. No $ or locale formatting. */
  depositedUsd: string | null;
  earnings: string | null;
  /** Raw numeric value or null. No $ or locale formatting. */
  earningsUsd: string | null;
  maturityDate?: string;
  apyBreakdown?: { base: number; reward: number; total: number };
}

export interface StandardOpportunityLendDetail {
  protocolName: string;
  networkName: string;
  tvlUsd: number;
  assetSymbol?: string;
  assetLogo?: string;
  assetAddress?: string;
  protocolLogo?: string;
  description?: string;
  stakersCount?: number;
  apy30day?: number;
  apy7day?: number;
}

export interface StandardOpportunityBase {
  id: string;
  vendor: Vendor;
  network: string;
  protocol: string;
  token: string;
  vaultAddress: string;
  metrics: StandardOpportunityMetrics;
  name?: string;
  tokenIcon?: string;
  tokenNetwork?: string;
  protocolIcon?: string;
  apyFormatted?: string;
  tvlFormatted?: string;
}

export interface StandardOpportunityLend extends StandardOpportunityBase {
  category: OpportunityCategory.Lend;
  lend: StandardOpportunityLendDetail;
}

export type StandardOpportunity = StandardOpportunityLend;

export type VaultsOpportunity = StandardOpportunityLend & { vendor: Vendor.Vaults };

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
  vendor: string;
  userAddress: string;
  availableActions: string[];
  transactionContext: StandardTransactionContext | null;
}

export interface TransactionQuoteRequest {
  category: OpportunityCategory;
  action: 'deposit' | 'redeem' | 'swap' | 'enter' | 'exit' | 'rollover' | 'claim';
  amount: string;
  userAddress: string;
  inputTokenAddress?: string;
  outputTokenAddress?: string;
  slippage?: number;
  simulate?: boolean;
  rolloverTargetOpportunityId?: string;
  rolloverAmount?: string;
  network?: string;
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
  vendor: string;
  action: string;
  canExecute: boolean;
  estimatedGas: string;
  estimatedGasUsd: string;
  receiveAmount?: string;
  receiveAmountFormatted?: string;
  priceImpact?: number;
  transactionSteps: TransactionStep[];
}

export type LendAvailableActions = AvailableActions & {
  vendor: Vendor.Vaults;
  transactionContext: StandardTransactionContext;
};

export type LendTransactionQuoteResponse = TransactionQuoteResponse & {
  vendor: Vendor.Vaults;
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
  amountFormatted: string;
  valueUsd: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenIcon?: string;
  apy?: number;
  estimatedEarningsUsd?: number;
  opportunity: {
    id: string;
    name: string;
    protocol: string;
    apy?: number;
    tvl?: number;
  };
  isExpired?: boolean;
}

export interface UserPositionsResponse {
  userAddress: string;
  positions: StandardUserPosition[];
  totalValueUsd: number;
  estimatedEarningsUsd: number;
  estimatedEarningsMonthlyUsd: number;
  estimatedEarningsYearlyPercentage: number;
  estimatedEarningsMonthlyPercentage: number;
  netApy: number;
  categoryApy: {
    lend: number;
  };
  summary: {
    byCategory: Record<OpportunityCategory, { count: number; valueUsd: number }>;
    byVendor: Record<Vendor, { count: number; valueUsd: number }>;
  };
  cachedAt?: number;
  expiresAt?: number;
  errors?: Array<{ category: string; error: string }>;
}

export interface StandardTransactionHistory {
  timestamp: number;
  eventType: string;
  assetAmount: string;
  assetSymbol: string;
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
  getOpportunityDetails(id: string, network?: string): Promise<StandardOpportunity>;
  getHistoricalData(
    id: string,
    range: HistoricalTimeRange,
    network?: string,
  ): Promise<HistoricalData>;
  getAvailableActions(id: string, userAddress: string, network?: string): Promise<AvailableActions>;
  getTransactionQuote(
    id: string,
    request: TransactionQuoteRequest,
    network?: string,
  ): Promise<TransactionQuoteResponse>;
  getUserPositions(userAddress: string, network?: string): Promise<StandardUserPosition[]>;
  getUserTransactions(
    id: string,
    userAddress: string,
    network?: string,
  ): Promise<StandardTransactionHistory[]>;
}

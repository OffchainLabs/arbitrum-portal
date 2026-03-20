import { createConfig, getStepTransaction, getTransactionHistory } from '@lifi/sdk';
import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';

import { LIFI_INTEGRATOR_IDS, getLifiRoutes } from '@/bridge/app/api/crosschain-transfers/lifi';
import { ChainId } from '@/bridge/types/ChainId';
import { rpcURLs } from '@/bridge/util/networks';

import {
  fetchAlignedPriceLookup,
  fetchDuneHistoricalData,
  fetchDuneHistoricalDataMerged,
} from '../lib/duneService';
import { resolveAdapterWindow } from '../lib/historicalWindow';
import { fetchLifiUserPositions } from '../lib/lifiPositions';
import { buildLifiQuoteData } from '../lib/lifiQuote';
import { toStandardTransactionHistory } from '../lib/lifiTransactions';
import {
  LIQUID_STAKING_OPPORTUNITIES,
  type LiquidStakingOpportunitySeed,
  getLiquidStakingDataSource,
  getLiquidStakingOpportunity,
  updateLiquidStakingOpportunitiesWithDuneData,
  updateLiquidStakingOpportunityWithDuneData,
} from '../lib/liquidStaking';
import { ValidationError } from '../lib/validation';
import {
  AvailableActions,
  type EarnChainId,
  HistoricalData,
  HistoricalDataPoint,
  type HistoricalDataRequestOptions,
  type HistoricalTimeRange,
  OpportunityCategory,
  OpportunityFilters,
  StandardOpportunity,
  StandardTransactionHistory,
  StandardUserPosition,
  TransactionQuoteRequest,
  TransactionQuoteResponse,
  Vendor,
  VendorAdapter,
} from '../types';

export class LiFiAdapter implements VendorAdapter {
  vendor = Vendor.LiFi;

  private getArbitrumPublicClient() {
    return createPublicClient({
      chain: arbitrum,
      transport: http(rpcURLs[ChainId.ArbitrumOne]),
    });
  }

  private isRouteRefreshError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const maybeError = error as
      | {
          status?: number;
          response?: { status?: number };
        }
      | undefined;
    const status = maybeError?.status ?? maybeError?.response?.status;

    return (
      status === 422 ||
      /unprocessable entity/i.test(message) ||
      /market conditions have changed/i.test(message) ||
      /request a new route/i.test(message)
    );
  }

  private async getQuoteStepWithTransaction(params: {
    inputTokenAddress: string;
    outputTokenAddress: string;
    amount: string;
    userAddress: string;
    slippage: number;
  }) {
    const fetchQuoteStep = async () => {
      const routes = await getLifiRoutes({
        fromChainId: ChainId.ArbitrumOne,
        toChainId: ChainId.ArbitrumOne,
        fromTokenAddress: params.inputTokenAddress,
        toTokenAddress: params.outputTokenAddress,
        fromAmount: params.amount,
        fromAddress: params.userAddress,
        slippage: params.slippage / 100,
        integrator: LIFI_INTEGRATOR_IDS.NORMAL,
      });

      if (!routes || routes.length === 0) {
        throw new Error('No routes found');
      }

      const quote = routes[0];
      if (!quote) {
        throw new Error('Route is undefined');
      }

      const step = quote.steps[0];
      if (!step) {
        throw new Error('Route step is undefined');
      }

      const { transactionRequest } = await getStepTransaction(step);
      const to = transactionRequest?.to;
      const data = transactionRequest?.data;
      if (!to || !data) {
        throw new Error('No transaction request found');
      }

      return {
        step,
        transactionRequest: {
          to,
          data,
          value: transactionRequest?.value,
        },
      };
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fetchQuoteStep();
      } catch (error) {
        if (!this.isRouteRefreshError(error)) {
          throw error instanceof Error
            ? error
            : new Error('Failed to get transaction quote');
        }
        if (attempt === 1) {
          throw new Error('Quote expired due to market changes. Please try again.');
        }
      }
    }

    throw new Error('Failed to get transaction quote');
  }

  async getOpportunities(filters: OpportunityFilters): Promise<StandardOpportunity[]> {
    // Create a copy of opportunities array to avoid mutating the original
    const opportunities = LIQUID_STAKING_OPPORTUNITIES.map((opp) => ({ ...opp }));

    // Update opportunities with current APY/TVL from Dune (in parallel)
    await updateLiquidStakingOpportunitiesWithDuneData(opportunities);

    let filtered = opportunities;
    if (filters.chainId && filters.chainId !== ChainId.ArbitrumOne) {
      filtered = [];
    }
    const minApy = filters.minApy;
    if (minApy != null) {
      filtered = filtered.filter((o) => o.rawApy != null && o.rawApy >= minApy);
    }
    const minTvl = filters.minTvl;
    if (minTvl != null) {
      filtered = filtered.filter((o) => o.rawTvl == null || o.rawTvl >= minTvl);
    }

    return filtered.map((opp) => this.transformToStandard(opp));
  }

  async getOpportunityDetails(
    id: string,
    chainId: EarnChainId = ChainId.ArbitrumOne,
  ): Promise<StandardOpportunity> {
    if (chainId !== ChainId.ArbitrumOne) {
      throw new ValidationError(
        'UNSUPPORTED_CHAIN_ID',
        `Liquid staking is not supported on chainId ${chainId}`,
      );
    }

    const opportunity = getLiquidStakingOpportunity(id);
    if (!opportunity) {
      throw new ValidationError(
        'OPPORTUNITY_NOT_FOUND',
        `Liquid staking opportunity not found: ${id}`,
        404,
      );
    }

    // Create a copy to avoid mutating the original
    const opportunityCopy = { ...opportunity };

    // Update opportunity with current APY/TVL from Dune
    await updateLiquidStakingOpportunityWithDuneData(opportunityCopy);

    return this.transformToStandard(opportunityCopy);
  }

  async getHistoricalData(
    id: string,
    range: HistoricalTimeRange,
    chainId: EarnChainId = ChainId.ArbitrumOne,
    options?: HistoricalDataRequestOptions,
  ): Promise<HistoricalData> {
    const { fromTimestamp, toTimestamp, granularity, resolvedRange } = resolveAdapterWindow(
      range,
      options,
    );
    const lookbackDays = Math.max(1, Math.ceil((toTimestamp - fromTimestamp) / (24 * 60 * 60)));

    const now = Math.floor(Date.now() / 1000);
    if (chainId !== ChainId.ArbitrumOne) {
      throw new ValidationError(
        'UNSUPPORTED_CHAIN_ID',
        `Liquid staking historical data is not supported on chainId ${chainId}`,
      );
    }

    // Check if this is a liquid staking token with Dune data source
    const dataSource = getLiquidStakingDataSource(id);
    if (!dataSource?.duneQueryIds.apy) {
      throw new ValidationError(
        'HISTORICAL_DATA_UNSUPPORTED_OPPORTUNITY',
        `Liquid staking historical data is not supported for opportunity ${id}`,
      );
    }

    try {
      // Fetch historical APY/TVL data from Dune
      // If TVL query is separate, merge the results
      const duneData =
        dataSource.duneQueryIds.tvl && dataSource.duneQueryIds.tvl !== dataSource.duneQueryIds.apy
          ? await fetchDuneHistoricalDataMerged(
              dataSource.duneQueryIds.apy,
              dataSource.duneQueryIds.tvl,
              lookbackDays,
            )
          : await fetchDuneHistoricalData(dataSource.duneQueryIds.apy, lookbackDays);

      const opportunity = getLiquidStakingOpportunity(id);
      const getAlignedPrice = await fetchAlignedPriceLookup({
        chainId,
        tokenAddress: id,
        assetSymbol: opportunity?.token,
        timestamps: duneData.map((point) => point.timestamp),
        granularity,
      });

      const dataPoints: HistoricalDataPoint[] = duneData.map((point) => {
        const price = getAlignedPrice(point.timestamp);
        return {
          timestamp: point.timestamp,
          apy: point.apy,
          tvl: point.tvl,
          price,
        };
      });

      return {
        data: dataPoints,
        granularity,
        range: resolvedRange,
        fromTimestamp,
        toTimestamp,
        isCached: false, // Always false at adapter level - route will determine if cached
        lastFetchedAt: now,
        expiresAt: now + 86400, // 24 hours
      };
    } catch (error) {
      // If Dune fetch fails, return empty data and let UI render unknown metrics.
      console.error(`Failed to fetch Dune historical data for ${id}:`, error);
      return {
        data: [],
        granularity,
        range: resolvedRange,
        fromTimestamp,
        toTimestamp,
        isCached: false,
        lastFetchedAt: now,
        expiresAt: now + 86400,
      };
    }
  }

  /**
   * Get available actions - "What can I do?"
   * Liquid staking doesn't have transaction context API, returns minimal context.
   */
  async getAvailableActions(
    id: string,
    userAddress: string,
    chainId: EarnChainId = ChainId.ArbitrumOne,
  ): Promise<AvailableActions> {
    if (chainId !== ChainId.ArbitrumOne) {
      throw new ValidationError(
        'UNSUPPORTED_CHAIN_ID',
        `Liquid staking is not supported on chainId ${chainId}`,
      );
    }
    // Liquid staking doesn't have transaction context API
    // Return minimal context with available actions only
    // Balances are fetched client-side via direct contract calls
    return {
      opportunityId: id,
      vendor: Vendor.LiFi,
      userAddress,
      availableActions: ['swap'],
      transactionContext: null,
    };
  }

  /**
   * Get transaction quote - "How do I execute this?"
   * Returns swap route and transaction steps for liquid staking.
   * Includes approval steps if needed.
   */
  async getTransactionQuote(
    id: string,
    request: TransactionQuoteRequest,
    chainId: EarnChainId = ChainId.ArbitrumOne,
  ): Promise<TransactionQuoteResponse> {
    if (chainId !== ChainId.ArbitrumOne) {
      throw new ValidationError(
        'UNSUPPORTED_CHAIN_ID',
        `Liquid staking is not supported on chainId ${chainId}`,
      );
    }

    const {
      action,
      amount,
      userAddress,
      inputTokenAddress,
      outputTokenAddress,
      slippage = 0.5,
    } = request;

    if (action !== 'swap') {
      throw new ValidationError(
        'INVALID_ACTION',
        `Unsupported action for liquid staking: ${action}`,
      );
    }

    if (!inputTokenAddress || !outputTokenAddress || !userAddress) {
      throw new ValidationError(
        'INVALID_SWAP_PARAMS',
        'inputTokenAddress, outputTokenAddress, and userAddress are required for swaps',
      );
    }

    const { step, transactionRequest } = await this.getQuoteStepWithTransaction({
      inputTokenAddress,
      outputTokenAddress,
      amount,
      userAddress,
      slippage,
    });

    const { transactionSteps, estimatedGas, estimatedGasUsd, receiveAmount, priceImpact } =
      await buildLifiQuoteData({
        amount,
        inputTokenAddress,
        userAddress,
        publicClient: this.getArbitrumPublicClient(),
        step,
        transactionRequest,
      });

    return {
      opportunityId: id,
      vendor: Vendor.LiFi,
      action: 'swap',
      canExecute: transactionSteps.length > 0,
      estimatedGas,
      estimatedGasUsd,
      receiveAmount,
      priceImpact,
      transactionSteps,
    };
  }

  async getUserPositions(
    userAddress: string,
    chainId: EarnChainId = ChainId.ArbitrumOne,
  ): Promise<StandardUserPosition[]> {
    // Only support Arbitrum for now
    if (chainId !== ChainId.ArbitrumOne) {
      return [];
    }

    // Create public client for Arbitrum
    const publicClient = this.getArbitrumPublicClient();

    const opportunities = LIQUID_STAKING_OPPORTUNITIES.map((opportunity) => ({ ...opportunity }));
    await updateLiquidStakingOpportunitiesWithDuneData(opportunities);

    return fetchLifiUserPositions({
      publicClient,
      opportunities,
      userAddress,
    });
  }

  async getUserTransactions(
    id: string,
    userAddress: string,
    chainId: EarnChainId = ChainId.ArbitrumOne,
  ): Promise<StandardTransactionHistory[]> {
    if (chainId !== ChainId.ArbitrumOne) {
      return [];
    }

    // For liquid staking, the ID should be the token address
    // Normalize it to lowercase for comparison
    const normalizedId = id.toLowerCase();

    // Configure LiFi SDK with integrator and API key (required for valid responses)
    createConfig({
      integrator: LIFI_INTEGRATOR_IDS.NORMAL,
      apiKey: process.env.LIFI_KEY,
    });

    // Determine target token address (id is token address for liquid staking)
    const targetTokenAddress = normalizedId;

    // Calculate fromTimestamp (10 years ago to get all historical transactions)
    const fromTimestamp = Math.floor((Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) / 1000);

    // Fetch all LiFi transactions for the user using SDK
    const response = await getTransactionHistory({
      wallet: userAddress,
      fromTimestamp,
    });

    const transfers = response.transfers || [];
    return toStandardTransactionHistory(transfers, targetTokenAddress);
  }

  private transformToStandard(opp: LiquidStakingOpportunitySeed): StandardOpportunity {
    const network = 'arbitrum';
    const vaultAddress = opp.vaultAddress || opp.id;
    return {
      id: vaultAddress,
      chainId: ChainId.ArbitrumOne,
      category: OpportunityCategory.LiquidStaking,
      vendor: Vendor.LiFi,
      network,
      protocol: opp.protocol,
      token: opp.token,
      vaultAddress,
      metrics: {
        rawApy: opp.rawApy,
        rawTvl: opp.rawTvl,
        deposited: null,
        depositedUsd: null,
        projectedEarningsUsd: null,
        apyBreakdown: opp.apyBreakdown,
      },
      name: opp.name,
      tokenIcon: opp.tokenIcon || '',
      tokenNetwork: opp.tokenNetwork || 'Arbitrum One',
      protocolIcon: opp.protocolIcon || '',
    };
  }
}

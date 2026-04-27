import { BigNumber } from 'ethers';
import { Address, encodeFunctionData, erc20Abi, parseUnits } from 'viem';

import { ARB_USDC_LOGO_URL, ARB_USDT_LOGO_URL, PENDLE_LOGO_URL } from '@/app-lib/earn/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';
import { truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import { extractAddressFromTokenId } from '@/earn-api/lib/pendle';

import { PENDLE_MARKET_CATEGORIES, PENDLE_MIN_TVL_USD, PendleMarketCategory } from '../lib/pendle';
import {
  PendleAsset,
  PendleMarket,
  getPendleAssets,
  getPendleConvertRoute,
  getPendleMarketByAddress,
  getPendleMarketDetails,
  getPendleMarketHistoricalData,
  getPendleMarkets,
  getPendleTransactionHistory,
  getPendleUserPositions,
} from '../lib/pendleApi';
import { ValidationError } from '../lib/validation';
import {
  AvailableActions,
  EarnChainId,
  HISTORICAL_VENDOR_TTL_SECONDS,
  HistoricalData,
  HistoricalDataPoint,
  type HistoricalDataRequestOptions,
  type HistoricalTimeRange,
  OpportunityCategory,
  OpportunityFilters,
  RolloverTarget,
  type SettlementToken,
  StandardOpportunity,
  StandardOpportunityFixedYield,
  StandardTransactionHistory,
  StandardUserPosition,
  TransactionQuoteRequest,
  TransactionQuoteResponse,
  TransactionStep,
  Vendor,
  VendorAdapter,
} from '../types';

const DEFAULT_CHAIN_ID = ChainId.ArbitrumOne;
const DEFAULT_PENDLE_DECIMALS = 18;
const PENDLE_TX_HISTORY_DEFAULT_PAGE = 1;
const PENDLE_TX_HISTORY_DEFAULT_PAGE_SIZE = 50;

function isSupportedChainId(chainId: EarnChainId): boolean {
  return chainId === ChainId.ArbitrumOne;
}

function assertSupportedChainId(
  chainId: EarnChainId,
): asserts chainId is typeof ChainId.ArbitrumOne {
  if (!isSupportedChainId(chainId)) {
    throw new ValidationError(
      'UNSUPPORTED_CHAIN_ID',
      `Fixed yield is not supported on chainId ${chainId}`,
    );
  }
}

function toRawAmount(value: string | number, decimals: number): string {
  const text = String(value).trim();
  if (!text || text === '0') {
    return '0';
  }

  if (/^\d+$/.test(text)) {
    return text;
  }

  try {
    return parseUnits(truncateExtraDecimals(text, decimals), decimals).toString();
  } catch {
    return '0';
  }
}

function finiteOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function apyAsPercentage(apy: number | undefined): number | null {
  return typeof apy === 'number' && Number.isFinite(apy) ? apy * 100 : null;
}

function getMarketTvl(market: PendleMarket): number | null {
  return finiteOrNull(market.details.totalTvl) ?? finiteOrNull(market.details.liquidity);
}

function getTokenSymbolFromMarketName(name: string): string {
  const stripped = name.replace(/^PT\s+/i, '').trim();
  if (!stripped) {
    return 'PT';
  }

  return stripped.split(' ')[0] || 'PT';
}

function enrichMarketWithAssets(
  market: PendleMarket,
  assetMetadataMap: Map<string, PendleAsset>,
): PendleMarket {
  const ptAsset = assetMetadataMap.get(market.pt);
  const syAsset = assetMetadataMap.get(market.sy);

  return {
    ...market,
    ptToken: ptAsset
      ? {
          address: ptAsset.address,
          symbol: ptAsset.symbol,
          icon: ptAsset.proIcon,
          decimals: ptAsset.decimals,
        }
      : market.ptToken,
    syToken: syAsset
      ? {
          address: syAsset.address,
          symbol: syAsset.symbol,
          icon: syAsset.proIcon,
          decimals: syAsset.decimals,
        }
      : market.syToken,
  };
}

function isPendleOpportunity(
  opportunity: StandardOpportunity,
): opportunity is StandardOpportunityFixedYield {
  return (
    opportunity.category === OpportunityCategory.FixedYield && opportunity.vendor === Vendor.Pendle
  );
}

export class PendleAdapter implements VendorAdapter {
  vendor = Vendor.Pendle;

  async getOpportunities(filters: OpportunityFilters): Promise<StandardOpportunity[]> {
    const chainId = filters.chainId ?? DEFAULT_CHAIN_ID;
    if (!isSupportedChainId(chainId)) {
      return [];
    }

    const response = await getPendleMarkets(chainId, true);

    const filtered = this.filterPendleMarkets(response.markets, filters);

    const tokenIds = filtered
      .map((market) => market.pt)
      .concat(filtered.map((market) => market.sy));
    const assetMetadataMap = await this.fetchAssetMetadata(chainId, tokenIds);

    return filtered
      .map((market) => enrichMarketWithAssets(market, assetMetadataMap))
      .map((market) => this.transformToStandard(market));
  }

  async getOpportunityDetails(
    id: string,
    chainId: EarnChainId = DEFAULT_CHAIN_ID,
  ): Promise<StandardOpportunity> {
    assertSupportedChainId(chainId);

    const [market, marketDetails] = await Promise.all([
      getPendleMarketByAddress(chainId, id),
      getPendleMarketDetails(chainId, id),
    ]);

    if (!market) {
      throw new ValidationError('OPPORTUNITY_NOT_FOUND', `Pendle market not found: ${id}`, 404);
    }

    const tokenIds = [market.pt, market.sy];
    const assetMetadataMap = await this.fetchAssetMetadata(chainId, tokenIds);

    const marketWithDetails = enrichMarketWithAssets(
      { ...market, details: marketDetails },
      assetMetadataMap,
    );

    return this.transformToStandard(marketWithDetails);
  }

  async getHistoricalData(
    id: string,
    range: HistoricalTimeRange,
    chainId: EarnChainId = DEFAULT_CHAIN_ID,
    options?: HistoricalDataRequestOptions,
  ): Promise<HistoricalData> {
    const toTimestamp = options?.toTimestamp ?? Math.floor(Date.now() / 1000);
    let fromTimestamp: number;
    let timeFrame: 'hour' | 'day' | 'week';
    let granularity: HistoricalData['granularity'];

    switch (range) {
      case '1d':
        fromTimestamp = toTimestamp - 24 * 60 * 60;
        timeFrame = 'hour';
        granularity = '1hour';
        break;
      case '1m':
        fromTimestamp = toTimestamp - 30 * 24 * 60 * 60;
        timeFrame = 'day';
        granularity = '1day';
        break;
      case '1y':
        fromTimestamp = toTimestamp - 365 * 24 * 60 * 60;
        timeFrame = 'week';
        granularity = '1week';
        break;
      case '7d':
      default:
        fromTimestamp = toTimestamp - 7 * 24 * 60 * 60;
        timeFrame = 'day';
        granularity = '1day';
        break;
    }

    if (options?.fromTimestamp) {
      fromTimestamp = options.fromTimestamp;
    }

    assertSupportedChainId(chainId);

    const timestampStart = new Date(fromTimestamp * 1000).toISOString();
    const timestampEnd = new Date(toTimestamp * 1000).toISOString();

    const rawData = await getPendleMarketHistoricalData({
      chainId,
      marketAddress: id,
      timeFrame,
      timestampStart,
      timestampEnd,
    });

    const dataPoints: HistoricalDataPoint[] = rawData
      .map((point) => ({
        timestamp: point.timestamp,
        apy: apyAsPercentage(point.impliedApy),
        tvl: point.totalTvl ?? point.tvl ?? null,
        price: point.ptPrice ?? null,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      data: dataPoints,
      granularity,
      range,
      fromTimestamp,
      toTimestamp,
      isCached: false,
      lastFetchedAt: toTimestamp,
      expiresAt: toTimestamp + HISTORICAL_VENDOR_TTL_SECONDS,
    };
  }

  async getAvailableActions(
    id: string,
    userAddress: string,
    chainId: EarnChainId = DEFAULT_CHAIN_ID,
  ): Promise<AvailableActions> {
    assertSupportedChainId(chainId);
    const [positions, marketsResponse] = await Promise.all([
      this.getUserPositions(userAddress, chainId),
      getPendleMarkets(chainId, false),
    ]);
    const normalizedId = id.toLowerCase();
    const position = positions.find((item) => item.opportunityId === normalizedId);
    const market = marketsResponse.markets.find((m) => m.address === normalizedId);
    const isMarketExpired = market?.expiry
      ? Date.now() >= new Date(market.expiry).getTime()
      : position?.expiryDate
        ? Date.now() >= new Date(position.expiryDate).getTime()
        : false;

    let availableActions: AvailableActions['availableActions'];
    if (isMarketExpired) {
      availableActions = position ? ['redeem', 'rollover'] : [];
    } else {
      availableActions = position ? ['enter', 'exit'] : ['enter'];
    }
    const rolloverTargets =
      isMarketExpired && position ? await this.getRolloverTargets(id, chainId) : [];

    return {
      opportunityId: id,
      vendor: Vendor.Pendle,
      userAddress,
      availableActions,
      transactionContext: null,
      rolloverTargets,
    };
  }

  async getTransactionQuote(
    id: string,
    request: TransactionQuoteRequest,
    chainId: EarnChainId = DEFAULT_CHAIN_ID,
  ): Promise<TransactionQuoteResponse> {
    const {
      action,
      amount,
      userAddress,
      inputTokenAddress,
      outputTokenAddress,
      slippage = 0.5,
      rolloverTargetOpportunityId,
    } = request;

    if (action !== 'enter' && action !== 'exit' && action !== 'redeem' && action !== 'rollover') {
      throw new ValidationError('INVALID_ACTION', `Unsupported action for Pendle: ${action}`);
    }

    if (action === 'rollover' && !rolloverTargetOpportunityId) {
      throw new ValidationError(
        'INVALID_ROLLOVER_PARAMS',
        'rolloverTargetOpportunityId is required for rollover action',
      );
    }

    if (!inputTokenAddress || !outputTokenAddress) {
      throw new ValidationError(
        'INVALID_QUOTE_PARAMS',
        'inputTokenAddress and outputTokenAddress are required',
      );
    }

    if (!userAddress) {
      throw new ValidationError('INVALID_QUOTE_PARAMS', 'userAddress is required');
    }

    if (!amount || !/^\d+$/.test(amount) || BigNumber.from(amount).lte(0)) {
      throw new ValidationError('INVALID_AMOUNT', 'Amount must be a positive integer in raw units');
    }

    assertSupportedChainId(chainId);
    const availableActions = await this.getAvailableActions(id, userAddress, chainId);

    if (!availableActions.availableActions.includes(action)) {
      throw new ValidationError(
        'ACTION_NOT_AVAILABLE',
        `Action "${action}" is not available for this Pendle position`,
      );
    }

    if (
      action === 'rollover' &&
      !availableActions.rolloverTargets?.some(
        (target) => target.id === rolloverTargetOpportunityId?.toLowerCase(),
      )
    ) {
      throw new ValidationError(
        'INVALID_ROLLOVER_TARGET',
        'Selected rollover target is not available for this Pendle position',
      );
    }

    const clampedSlippage = Math.min(Math.max(slippage, 0), 50) / 100;
    const route = await getPendleConvertRoute({
      chainId,
      tokensIn: [inputTokenAddress],
      amountsIn: [amount],
      tokensOut: [outputTokenAddress],
      receiver: userAddress,
      slippage: clampedSlippage,
      enableAggregator: true,
    });

    const firstRoute = route.routes?.[0];
    if (!firstRoute) {
      throw new ValidationError(
        'QUOTE_ROUTE_NOT_FOUND',
        'No route found in Pendle convert response',
      );
    }

    const transactionSteps: TransactionStep[] = [];
    const spenderAddress = firstRoute.tx.to;
    let stepNumber = 1;

    for (const approval of route.requiredApprovals ?? []) {
      const tokenAddress = approval.token.includes('-')
        ? approval.token.split('-')[1]
        : approval.token;
      if (!tokenAddress) {
        continue;
      }

      const approvalData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress as Address, BigInt(approval.amount)],
      });

      transactionSteps.push({
        step: stepNumber,
        type: 'approval',
        to: tokenAddress,
        data: approvalData,
        value: '0',
        chainId,
      });

      stepNumber += 1;
    }

    transactionSteps.push({
      step: stepNumber,
      type: 'transaction',
      to: firstRoute.tx.to,
      data: firstRoute.tx.data,
      value: firstRoute.tx.value || '0',
      chainId,
    });

    const receiveAmount = firstRoute.outputs?.[0]?.amount;

    return {
      opportunityId: id,
      vendor: Vendor.Pendle,
      action,
      canExecute: transactionSteps.length > 0,
      estimatedGas: '0',
      estimatedGasUsd: '0',
      receiveAmount,
      priceImpact: firstRoute.data?.priceImpact,
      transactionSteps,
    };
  }

  async getUserPositions(
    userAddress: string,
    chainId: EarnChainId = DEFAULT_CHAIN_ID,
  ): Promise<StandardUserPosition[]> {
    if (!isSupportedChainId(chainId)) {
      return [];
    }

    const [marketsResponse, userPositionsResponse] = await Promise.all([
      getPendleMarkets(chainId, false),
      getPendleUserPositions(userAddress),
    ]);

    const chainPositions = userPositionsResponse.positions.find(
      (entry) => entry.chainId === chainId,
    );
    if (!chainPositions) {
      return [];
    }

    const marketByAddress = new Map<string, PendleMarket>();
    for (const market of marketsResponse.markets) {
      marketByAddress.set(market.address, market);
    }

    const positions: StandardUserPosition[] = [];
    for (const position of chainPositions.openPositions.concat(chainPositions.closedPositions)) {
      const marketAddress = position.marketId.split('-').pop()?.toLowerCase();
      if (!marketAddress) {
        continue;
      }

      const market = marketByAddress.get(marketAddress);
      if (!market) {
        continue;
      }

      const tokenDecimals = market.ptToken?.decimals ?? DEFAULT_PENDLE_DECIMALS;
      const rawAmount = toRawAmount(position.pt.balance || '0', tokenDecimals);
      if (BigNumber.from(rawAmount).lte(0)) {
        continue;
      }

      const tvl = getMarketTvl(market) ?? undefined;
      const impliedApy = apyAsPercentage(market.details.impliedApy) ?? undefined;
      const positionValuation = Number(position.pt.valuation);
      const valueUsd = Number.isFinite(positionValuation) ? positionValuation : 0;
      const tokenSymbol = getTokenSymbolFromMarketName(market.name);
      const projectedEarningsUsd =
        valueUsd > 0 && impliedApy != null && impliedApy > 0
          ? (valueUsd * impliedApy) / 100
          : undefined;
      const expiryTime = market.expiry ? new Date(market.expiry).getTime() : null;

      positions.push({
        opportunityId: market.address,
        category: OpportunityCategory.FixedYield,
        vendor: Vendor.Pendle,
        network: 'arbitrum',
        amount: rawAmount,
        valueUsd,
        tokenAddress: market.pt,
        tokenSymbol,
        tokenDecimals,
        tokenIcon: market.ptToken?.icon,
        projectedEarningsUsd,
        opportunity: {
          id: market.address,
          name: market.name,
          protocol: 'Pendle',
          protocolLogo: '/images/pendle-logo.svg',
          apy: impliedApy ?? 0,
          tvl,
        },
        isExpired: expiryTime != null ? Date.now() >= expiryTime : undefined,
        expiryDate: market.expiry || undefined,
      });
    }

    positions.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
    return positions;
  }

  async getUserTransactions(
    id: string,
    userAddress: string,
    chainId: EarnChainId = DEFAULT_CHAIN_ID,
  ): Promise<StandardTransactionHistory[]> {
    if (!isSupportedChainId(chainId)) {
      return [];
    }

    const marketsResponse = await getPendleMarkets(chainId, false);
    const rawMarket = marketsResponse.markets.find(
      (candidate) => candidate.address === id.toLowerCase(),
    );

    const market = rawMarket
      ? enrichMarketWithAssets(
          rawMarket,
          await this.fetchAssetMetadata(chainId, [rawMarket.pt, rawMarket.sy]),
        )
      : undefined;

    const underlyingSymbol = market ? getTokenSymbolFromMarketName(market.name) : 'Asset';
    const ptSymbol = `PT${underlyingSymbol}`;
    const ptDecimals = market?.ptToken?.decimals ?? DEFAULT_PENDLE_DECIMALS;
    const underlyingDecimals = market?.syToken?.decimals ?? DEFAULT_PENDLE_DECIMALS;
    const ptIcon = market?.ptToken?.icon;
    const underlyingIcon = market?.syToken?.icon;

    const response = await getPendleTransactionHistory({
      userAddress,
      marketAddress: id,
      chainId,
      page: PENDLE_TX_HISTORY_DEFAULT_PAGE,
      pageSize: PENDLE_TX_HISTORY_DEFAULT_PAGE_SIZE,
      underlyingAssetSymbol: underlyingSymbol,
    });

    return response.transactions
      .map((transaction) => {
        const isExit = transaction.type === 'exit';
        const eventType = transaction.type;
        const inputAmountRaw = toRawAmount(
          transaction.inputAmount,
          isExit ? ptDecimals : underlyingDecimals,
        );
        const outputAmountRaw = toRawAmount(
          transaction.outputAmount,
          isExit ? underlyingDecimals : ptDecimals,
        );
        const assetAmountRaw = isExit ? outputAmountRaw : inputAmountRaw;
        const assetSymbol = isExit ? underlyingSymbol : ptSymbol;
        const assetDecimals = isExit ? underlyingDecimals : ptDecimals;

        return {
          timestamp: transaction.timestamp,
          eventType,
          assetAmountRaw,
          assetSymbol,
          decimals: assetDecimals,
          assetLogo: isExit ? underlyingIcon : ptIcon,
          inputAssetAmountRaw: inputAmountRaw,
          inputAssetSymbol: isExit ? ptSymbol : underlyingSymbol,
          inputAssetDecimals: isExit ? ptDecimals : underlyingDecimals,
          inputAssetLogo: isExit ? ptIcon : underlyingIcon,
          outputAssetAmountRaw: outputAmountRaw,
          outputAssetSymbol: isExit ? underlyingSymbol : ptSymbol,
          outputAssetDecimals: isExit ? underlyingDecimals : ptDecimals,
          outputAssetLogo: isExit ? underlyingIcon : ptIcon,
          chainId,
          transactionHash: transaction.txHash,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private async fetchAssetMetadata(
    chainId: number,
    tokenIds: string[],
  ): Promise<Map<string, PendleAsset>> {
    if (!tokenIds.length) {
      return new Map();
    }

    try {
      const assetsResponse = await getPendleAssets(chainId, tokenIds);
      const map = new Map<string, PendleAsset>();

      for (const asset of assetsResponse.assets) {
        map.set(`${asset.chainId}-${asset.address.toLowerCase()}`, asset);
      }

      return map;
    } catch (error) {
      console.warn('[PendleAdapter] fetchAssetMetadata failed:', error);
      return new Map();
    }
  }

  private filterPendleMarkets(
    markets: PendleMarket[],
    filters: OpportunityFilters,
  ): PendleMarket[] {
    return markets.filter((market) => {
      if (market.chainId !== ChainId.ArbitrumOne) {
        return false;
      }

      const hasSupportedCategory = market.categoryIds.some((categoryId) =>
        PENDLE_MARKET_CATEGORIES.includes(categoryId.toLowerCase() as PendleMarketCategory),
      );
      if (!hasSupportedCategory) {
        return false;
      }

      const tvl = getMarketTvl(market);
      const apy = apyAsPercentage(market.details.impliedApy);

      if (tvl == null || tvl < PENDLE_MIN_TVL_USD) {
        return false;
      }
      if (filters.minTvl != null && tvl < filters.minTvl) {
        return false;
      }
      if (filters.minApy != null && (apy == null || apy < filters.minApy)) {
        return false;
      }

      return true;
    });
  }

  private transformToStandard(market: PendleMarket): StandardOpportunity {
    const tvlUsd = getMarketTvl(market);
    const fixedApy = apyAsPercentage(market.details.impliedApy);
    const underlyingApy = apyAsPercentage(market.details.underlyingApy);
    const liquidityUsd = finiteOrNull(market.details.liquidity) ?? undefined;
    const tradingVolumeUsd = finiteOrNull(market.details.tradingVolume) ?? undefined;

    return {
      id: market.address,
      category: OpportunityCategory.FixedYield,
      vendor: Vendor.Pendle,
      chainId: ChainId.ArbitrumOne,
      network: 'arbitrum',
      protocol: 'Pendle',
      token: getTokenSymbolFromMarketName(market.name),
      vaultAddress: market.address,
      metrics: {
        rawApy: fixedApy,
        rawTvl: tvlUsd,
        deposited: null,
        depositedUsd: null,
        projectedEarningsUsd: null,
        maturityDate: market.expiry,
      },
      name: market.name,
      tokenIcon: market.ptToken?.icon || '',
      tokenNetwork: 'Arbitrum',
      protocolIcon: PENDLE_LOGO_URL,
      fixedYield: {
        pt: market.pt,
        detailsTvlUsd: tvlUsd,
        detailsImpliedApy: fixedApy,
        expiry: market.expiry,
        detailsUnderlyingApy: underlyingApy,
        detailsLiquidityUsd: liquidityUsd,
        detailsTradingVolumeUsd: tradingVolumeUsd,
        ptTokenIcon: market.ptToken?.icon,
        underlyingAsset: market.underlyingAsset,
        sySupplyCap: market.details.sySupplyCap,
        syCurrentSupply: market.details.syCurrentSupply,
        ptTokenDecimals: market.ptToken?.decimals,
        underlyingTokenDecimals: market.syToken?.decimals,
        settlementTokens: this.buildSettlementTokens(market),
      },
    };
  }

  private buildSettlementTokens(market: PendleMarket): SettlementToken[] {
    const tokens: SettlementToken[] = [];
    const underlyingAddress = extractAddressFromTokenId(market.underlyingAsset);
    const tokenSymbol = getTokenSymbolFromMarketName(market.name);

    if (underlyingAddress) {
      tokens.push({
        symbol: tokenSymbol,
        address: underlyingAddress,
        decimals: market.syToken?.decimals ?? DEFAULT_PENDLE_DECIMALS,
        logoUrl: market.ptToken?.icon,
      });
    }

    tokens.push({
      symbol: 'USDC',
      address: CommonAddress.ArbitrumOne.USDC,
      decimals: 6,
      logoUrl: ARB_USDC_LOGO_URL,
    });
    tokens.push({
      symbol: 'USDT',
      address: CommonAddress.ArbitrumOne.USDT,
      decimals: 6,
      logoUrl: ARB_USDT_LOGO_URL,
    });

    return tokens;
  }

  private async getRolloverTargets(
    opportunityId: string,
    chainId: EarnChainId,
  ): Promise<RolloverTarget[]> {
    const sourceOpportunity = await this.getOpportunityDetails(opportunityId, chainId);
    if (!isPendleOpportunity(sourceOpportunity)) {
      return [];
    }

    const allOpportunities = await this.getOpportunities({ chainId });

    return allOpportunities
      .filter(isPendleOpportunity)
      .filter((candidate) => candidate.id !== sourceOpportunity.id)
      .filter((candidate) => candidate.chainId === chainId)
      .filter(
        (candidate) =>
          (candidate.fixedYield.underlyingAsset || '') ===
          (sourceOpportunity.fixedYield.underlyingAsset || ''),
      )
      .filter((candidate) => {
        if (!candidate.fixedYield.expiry) {
          return false;
        }

        return new Date(candidate.fixedYield.expiry).getTime() > Date.now();
      })
      .sort((left, right) => {
        const rightApy = right.fixedYield.detailsImpliedApy ?? 0;
        const leftApy = left.fixedYield.detailsImpliedApy ?? 0;
        if (rightApy !== leftApy) {
          return rightApy - leftApy;
        }

        return (
          new Date(left.fixedYield.expiry || 0).getTime() -
          new Date(right.fixedYield.expiry || 0).getTime()
        );
      })
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        tokenSymbol: candidate.token,
        ptTokenAddress: extractAddressFromTokenId(candidate.fixedYield.pt),
        ptTokenDecimals: candidate.fixedYield.ptTokenDecimals,
        ptTokenIcon: candidate.fixedYield.ptTokenIcon || candidate.tokenIcon,
        expiry: candidate.fixedYield.expiry,
        impliedApy: candidate.fixedYield.detailsImpliedApy,
      }));
  }
}

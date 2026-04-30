import { type DetailedVault, OpportunityCategory } from '@/app-types/earn/vaults';
import { ChainId } from '@/bridge/types/ChainId';

import { fetchAlignedPriceLookup } from '../lib/duneService';
import { resolveAdapterWindow } from '../lib/historicalWindow';
import { parseOptionalNumber, parseOptionalPercentage } from '../lib/metricParsers';
import { DEFAULT_ALLOWED_ASSETS, vaultsSdk } from '../lib/vaultsSdk';
import {
  AvailableActions,
  type EarnChainId,
  type EarnTransactionAction,
  HISTORICAL_VENDOR_TTL_SECONDS,
  HistoricalData,
  HistoricalDataPoint,
  type HistoricalDataRequestOptions,
  type HistoricalTimeRange,
  OpportunityFilters,
  type PendingHistoryTemplate,
  StandardOpportunity,
  StandardTokenContextItem,
  StandardTransactionContext,
  StandardTransactionHistory,
  StandardUserPosition,
  type TransactionDetailsTemplate,
  TransactionQuoteRequest,
  TransactionQuoteResponse,
  TransactionStep,
  VaultsAction,
  Vendor,
  VendorAdapter,
  getEarnNetworkFromChainId,
} from '../types';

export type VaultsNetwork = 'mainnet' | 'arbitrum';

export type VaultsProtocol = 'aave' | 'compound' | 'fluid' | 'morpho';

export type VaultsActionType = 'deposit' | 'redeem';

type VaultHistoricalPoint = {
  timestamp: number;
  apy?: { total?: number } | null;
  tvl?: { usd?: string } | null;
};

export class VaultsAdapter implements VendorAdapter {
  vendor = Vendor.Vaults;

  private toVaultsNetwork(chainId: EarnChainId): VaultsNetwork {
    return getEarnNetworkFromChainId(chainId) as VaultsNetwork;
  }

  private toEarnChainId(networkName: string | undefined): EarnChainId {
    const normalizedNetwork = networkName?.trim().toLowerCase();
    if (normalizedNetwork === 'mainnet' || normalizedNetwork === 'ethereum') {
      return ChainId.Ethereum;
    }
    if (normalizedNetwork === 'arbitrum' || normalizedNetwork === 'arbitrum one') {
      return ChainId.ArbitrumOne;
    }
    throw new Error(`Unsupported vault network: ${networkName ?? 'undefined'}`);
  }

  private normalizeUsdValue(rawValue: string | undefined): string {
    if (!rawValue) {
      return '0';
    }
    const parsed = parseFloat(rawValue.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed.toString() : '0';
  }

  async getOpportunities(filters: OpportunityFilters): Promise<StandardOpportunity[]> {
    const network = filters.chainId ? this.toVaultsNetwork(filters.chainId) : undefined;
    const response = await vaultsSdk.getAllVaults({
      query: {
        allowedNetworks: network ? ([network] as VaultsNetwork[]) : undefined,
        allowedProtocols: ['aave', 'compound', 'fluid', 'morpho'] satisfies VaultsProtocol[],
        minTvl: filters.minTvl,
        allowedAssets: [...DEFAULT_ALLOWED_ASSETS],
        perPage: filters.perPage || 50,
      },
    });

    const vaults = response.data;

    let filtered = vaults;
    if (filters.minApy) {
      filtered = filtered.filter((vault) => {
        const apyData = vault.apy?.['30day'] ?? vault.apy?.['7day'] ?? vault.apy?.['1day'];
        const apyPercentage = parseOptionalPercentage(apyData?.total);
        return (
          apyPercentage !== null && filters.minApy !== undefined && apyPercentage >= filters.minApy
        );
      });
    }

    return filtered.map((vault) => this.transformToStandard(vault));
  }

  async getOpportunityDetails(id: string, chainId: EarnChainId): Promise<StandardOpportunity> {
    const network = this.toVaultsNetwork(chainId);
    const vault = await vaultsSdk.getVault({
      path: {
        network,
        vaultAddress: id,
      },
    });

    return this.transformToStandard(vault);
  }

  async getHistoricalData(
    id: string,
    range: HistoricalTimeRange,
    chainId: EarnChainId,
    options?: HistoricalDataRequestOptions,
  ): Promise<HistoricalData> {
    const network = this.toVaultsNetwork(chainId);
    const { fromTimestamp, toTimestamp, granularity, resolvedRange } = resolveAdapterWindow(
      range,
      options,
    );

    if (fromTimestamp >= toTimestamp) {
      throw new Error('fromTimestamp must be lower than toTimestamp');
    }

    const rawHistoricalPoints = await this.fetchHistoricalPoints({
      id,
      network,
      fromTimestamp,
      toTimestamp,
      granularity,
    });

    let assetAddress: string | null = null;
    let assetSymbol = options?.assetSymbol;
    try {
      const vault = await vaultsSdk.getVault({
        path: { network, vaultAddress: id },
      });
      assetAddress = vault.asset.address;
      if (!assetSymbol) {
        assetSymbol = vault.asset.symbol;
      }
    } catch (error) {
      console.warn(
        '[earn][dune] Failed to fetch vault asset metadata for historical price lookup',
        {
          opportunityId: id,
          network,
          chainId,
          assetSymbol,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    const getAlignedPrice = await fetchAlignedPriceLookup({
      chainId,
      tokenAddress: assetAddress,
      assetSymbol,
      timestamps: rawHistoricalPoints.map((point) => point.timestamp),
      granularity,
    });

    const dataPoints: HistoricalDataPoint[] = rawHistoricalPoints
      .map((point) => {
        const price = getAlignedPrice(point.timestamp);
        const apyTotal = point.apy?.total;
        const tvlRaw = point.tvl?.usd;
        const tvlParsed = tvlRaw !== null ? Number(tvlRaw) : null;

        return {
          timestamp: point.timestamp,
          apy: typeof apyTotal !== 'undefined' && apyTotal !== null ? apyTotal * 100 : null,
          tvl: tvlParsed !== null && Number.isFinite(tvlParsed) ? tvlParsed : null,
          price,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const now = Math.floor(Date.now() / 1000);

    return {
      data: dataPoints,
      granularity,
      range: resolvedRange,
      fromTimestamp,
      toTimestamp,
      isCached: false,
      lastFetchedAt: now,
      expiresAt: now + HISTORICAL_VENDOR_TTL_SECONDS,
    };
  }

  private async fetchHistoricalPoints(params: {
    id: string;
    network: VaultsNetwork;
    fromTimestamp: number;
    toTimestamp: number;
    granularity: '1hour' | '1day' | '1week';
  }): Promise<VaultHistoricalPoint[]> {
    const { id, network, fromTimestamp, toTimestamp, granularity } = params;
    const bucketSeconds = granularity === '1hour' ? 3600 : granularity === '1week' ? 604800 : 86400;
    const requestedBuckets = Math.max(1, Math.ceil((toTimestamp - fromTimestamp) / bucketSeconds));
    const perPage = Math.min(200, Math.max(24, requestedBuckets + 2));
    const maxPages = 50;
    const pointsByTimestamp = new Map<number, VaultHistoricalPoint>();

    const collectPages = async (page: number): Promise<void> => {
      if (page >= maxPages) {
        return;
      }

      const response = await vaultsSdk.getVaultHistoricalData({
        path: { network, vaultAddress: id },
        query: {
          page,
          perPage,
          apyInterval: '7day',
          fromTimestamp,
          toTimestamp,
          granularity,
        },
      });

      const pagePoints = (response.data ?? []) as VaultHistoricalPoint[];
      if (pagePoints.length === 0) {
        return;
      }

      const previousPointCount = pointsByTimestamp.size;
      pagePoints
        .filter(
          (point): point is VaultHistoricalPoint & { timestamp: number } =>
            typeof point.timestamp === 'number',
        )
        .forEach((point) => pointsByTimestamp.set(point.timestamp, point));

      if (pointsByTimestamp.size === previousPointCount) {
        return;
      }

      const [oldest, newest] = pointsByTimestamp
        .keys()
        .reduce<
          [number, number]
        >(([min, max], ts) => [Math.min(min, ts), Math.max(max, ts)], [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]);

      if ((oldest <= fromTimestamp && newest >= toTimestamp) || pagePoints.length < perPage) {
        return;
      }

      return collectPages(page + 1);
    };

    await collectPages(0);

    return [...pointsByTimestamp.values()]
      .filter((point) => point.timestamp >= fromTimestamp && point.timestamp <= toTimestamp)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  async getAvailableActions(
    id: string,
    userAddress: string,
    chainId: EarnChainId,
  ): Promise<AvailableActions> {
    const network = this.toVaultsNetwork(chainId);
    const context = await vaultsSdk.getTransactionsContext({
      path: {
        userAddress,
        network,
        vaultAddress: id,
      },
    });

    const toTokenItem = (
      t:
        | {
            decimals?: number;
            symbol?: string;
            address?: string;
            balanceNative?: string;
            balanceUsd?: string;
          }
        | null
        | undefined,
    ): StandardTokenContextItem => ({
      decimals: t?.decimals ?? 18,
      symbol: t?.symbol ?? '',
      address: t?.address ?? '',
      balanceNative: t?.balanceNative,
      balanceUsd: t?.balanceUsd,
    });

    const transactionContext: StandardTransactionContext = {
      asset: toTokenItem(context?.asset),
      lpToken: toTokenItem(context?.lpToken),
    };

    return {
      opportunityId: id,
      vendor: Vendor.Vaults,
      userAddress,
      availableActions: ['deposit', 'redeem'],
      transactionContext,
    };
  }

  async getTransactionQuote(
    id: string,
    request: TransactionQuoteRequest,
    chainId: EarnChainId,
  ): Promise<TransactionQuoteResponse> {
    const network = this.toVaultsNetwork(chainId);
    const { action, amount, userAddress, simulate = false } = request;

    if (!userAddress) {
      throw new Error('userAddress is required for vault transactions');
    }

    if (action !== 'deposit' && action !== 'redeem') {
      throw new Error(
        `Invalid action for Vaults: ${action}. Only 'deposit' and 'redeem' are supported.`,
      );
    }

    // Fetch context + opportunity in parallel for display metadata
    const [contextResult, opportunity] = await Promise.all([
      this.getAvailableActions(id, userAddress, chainId),
      this.getOpportunityDetails(id, chainId),
    ]);

    const assetAddress =
      request.inputTokenAddress || contextResult.transactionContext?.asset?.address;

    if (!assetAddress) {
      throw new Error(
        'Asset address is required. Provide inputTokenAddress or ensure available actions context includes asset address.',
      );
    }

    const actionsResponse = await vaultsSdk.getActions({
      path: {
        action: action as VaultsActionType,
        userAddress,
        network,
        vaultAddress: id,
      },
      query: {
        assetAddress,
        amount,
        simulate,
        all: false,
      },
    });

    if (!actionsResponse || !actionsResponse.actions || !Array.isArray(actionsResponse.actions)) {
      throw new Error(
        `Invalid actions response: expected actions array. Received: ${JSON.stringify(actionsResponse)}`,
      );
    }

    const transactionSteps: TransactionStep[] = actionsResponse.actions.map(
      (actionItem: VaultsAction, index: number) => {
        if (!('tx' in actionItem) || !actionItem.tx || typeof actionItem.tx !== 'object') {
          throw new Error(
            `Invalid action at step ${index + 1}: missing 'tx' object. Available fields: ${Object.keys(actionItem).join(', ')}`,
          );
        }

        const tx = actionItem.tx as {
          to?: string;
          data?: string;
          value?: string;
          chainId?: number;
        };

        if (!tx.to || typeof tx.to !== 'string' || !tx.to.length) {
          throw new Error(
            `Invalid action at step ${index + 1}: missing or invalid 'tx.to' address`,
          );
        }
        if (!tx.data || typeof tx.data !== 'string' || !tx.data.length) {
          throw new Error(
            `Invalid action at step ${index + 1}: missing or invalid 'tx.data' field`,
          );
        }
        if (!tx.chainId || typeof tx.chainId !== 'number') {
          throw new Error(`Invalid action at step ${index + 1}: missing or invalid 'tx.chainId'`);
        }

        const name =
          ('name' in actionItem && typeof actionItem.name === 'string' && actionItem.name) || '';
        const description: string =
          name ||
          ('description' in actionItem &&
            typeof actionItem.description === 'string' &&
            actionItem.description) ||
          `Transaction ${request.action || 'action'}`;

        const stepType: 'approval' | 'transaction' = name.toLowerCase().includes('approve')
          ? 'approval'
          : 'transaction';

        return {
          step: index + 1,
          type: stepType,
          to: tx.to,
          data: tx.data,
          value: tx.value || '0',
          chainId: tx.chainId,
          description,
        };
      },
    );

    const estimatedGas =
      'estimatedGas' in actionsResponse && typeof actionsResponse.estimatedGas === 'string'
        ? actionsResponse.estimatedGas
        : '0';
    const estimatedGasUsdValue =
      'estimatedGasUsd' in actionsResponse ? actionsResponse.estimatedGasUsd : undefined;
    const estimatedGasUsdRaw =
      typeof estimatedGasUsdValue === 'string' || typeof estimatedGasUsdValue === 'number'
        ? String(estimatedGasUsdValue)
        : '0';

    const context = contextResult.transactionContext;

    const receiveAmount =
      'receiveAmount' in actionsResponse &&
      typeof actionsResponse.receiveAmount === 'string' &&
      actionsResponse.receiveAmount
        ? actionsResponse.receiveAmount
        : undefined;

    return {
      opportunityId: id,
      vendor: Vendor.Vaults,
      action,
      canExecute: transactionSteps.length > 0,
      estimatedGas,
      estimatedGasUsd: this.normalizeUsdValue(estimatedGasUsdRaw),
      receiveAmount,
      transactionSteps,
      transactionDetailsTemplate: this.buildTransactionDetailsTemplate(
        action,
        amount,
        context,
        opportunity,
        transactionSteps,
        receiveAmount,
      ),
      pendingHistoryTemplate: this.buildPendingHistoryTemplate(
        action,
        amount,
        context,
        opportunity,
        transactionSteps,
        receiveAmount,
      ),
    };
  }

  private buildTransactionDetailsTemplate(
    action: EarnTransactionAction,
    amount: string,
    context: StandardTransactionContext | null,
    opportunity: StandardOpportunity,
    transactionSteps: TransactionStep[],
    receiveAmount?: string,
  ): TransactionDetailsTemplate {
    const lend = 'lend' in opportunity ? opportunity.lend : undefined;
    const txChainId = transactionSteps[0]?.chainId || 0;
    const isRedeem = action === 'redeem';
    const validReceiveAmount =
      receiveAmount && /^\d+$/.test(receiveAmount) ? receiveAmount : undefined;
    return {
      amount: isRedeem && validReceiveAmount ? validReceiveAmount : amount,
      tokenSymbol: context?.asset?.symbol || opportunity.token,
      decimals: context?.asset?.decimals ?? 18,
      assetLogo: lend?.assetLogo,
      chainId: txChainId as EarnChainId,
      protocolName: lend?.protocolName ?? opportunity.protocol,
      protocolLogo: lend?.protocolLogo,
      opportunityName: opportunity.name,
    };
  }

  private buildPendingHistoryTemplate(
    action: EarnTransactionAction,
    amount: string,
    context: StandardTransactionContext | null,
    opportunity: StandardOpportunity,
    transactionSteps: TransactionStep[],
    receiveAmount?: string,
  ): PendingHistoryTemplate {
    const lend = 'lend' in opportunity ? opportunity.lend : undefined;
    const assetSymbol = context?.asset?.symbol || opportunity.token;
    const assetDecimals = context?.asset?.decimals ?? 18;
    const assetLogo = lend?.assetLogo;
    const lpTokenSymbol = context?.lpToken?.symbol;
    const lpTokenDecimals = context?.lpToken?.decimals ?? 18;
    const isRedeem = action === 'redeem';
    const txChainId = transactionSteps[0]?.chainId || 0;
    const validReceiveAmount =
      receiveAmount && /^\d+$/.test(receiveAmount) ? receiveAmount : undefined;

    return {
      eventType: isRedeem ? 'redeem' : 'deposit',
      assetAmountRaw: isRedeem && validReceiveAmount ? validReceiveAmount : amount,
      assetSymbol,
      decimals: assetDecimals,
      assetLogo,
      inputAssetAmountRaw: amount,
      inputAssetSymbol: assetSymbol,
      inputAssetDecimals: assetDecimals,
      inputAssetLogo: assetLogo,
      outputAssetAmountRaw: validReceiveAmount,
      outputAssetSymbol: isRedeem ? assetSymbol : lpTokenSymbol || assetSymbol,
      outputAssetDecimals: isRedeem ? assetDecimals : lpTokenDecimals,
      outputAssetLogo: assetLogo,
      chainId: txChainId as EarnChainId,
    };
  }

  async getUserPositions(
    userAddress: string,
    chainId: EarnChainId,
  ): Promise<StandardUserPosition[]> {
    const network = this.toVaultsNetwork(chainId);
    const response = await vaultsSdk.getPositions({
      path: { userAddress },
      query: { allowedNetworks: [network] },
    });

    return response.data.map((position) => {
      const lpTokenBalanceNative = position.lpToken?.balanceNative || '0';
      const lpTokenDecimals = position.lpToken?.decimals ?? 18;

      const assetSymbol = position.asset?.symbol || '';
      const assetAddress = position.asset?.address || '';

      const valueUsd = parseFloat(
        (position.lpToken?.balanceUsd || '0').replace(/[^0-9.-]/g, '') || '0',
      );
      const apy = position.apy?.total ? position.apy.total * 100 : 0;
      const projectedEarningsUsd = apy > 0 && valueUsd > 0 ? (valueUsd * apy) / 100 : undefined;

      const addressLower = position.address.toLowerCase();
      return {
        opportunityId: addressLower,
        category: OpportunityCategory.Lend,
        vendor: Vendor.Vaults,
        network: position.network?.name || network,
        amount: lpTokenBalanceNative,
        valueUsd,
        tokenAddress: assetAddress,
        tokenSymbol: assetSymbol,
        tokenDecimals: lpTokenDecimals,
        tokenIcon: position.asset?.assetLogo,
        projectedEarningsUsd,
        opportunity: {
          id: addressLower,
          name: position.name || 'Unknown Vault',
          protocol: position.protocol?.name || 'Unknown',
          protocolLogo: position.protocol?.protocolLogo,
          apy,
          tvl: undefined,
        },
      };
    });
  }

  async getUserTransactions(
    id: string,
    userAddress: string,
    chainId: EarnChainId,
  ): Promise<StandardTransactionHistory[]> {
    const network = this.toVaultsNetwork(chainId);
    const response = await vaultsSdk.getUserVaultEvents({
      path: {
        userAddress,
        network,
        vaultAddress: id,
      },
    });

    if (!response.data || response.items === 0) {
      return [];
    }

    return response.data
      .map((event) => {
        const decimals = response.asset.decimals || 18;
        const assetSymbol = response.asset.symbol;
        const assetLogo = response.asset.assetLogo;
        const amountRaw = event.assetAmountNative || '0';
        const isWithdraw = event.eventType === 'withdrawal';
        const eventType = isWithdraw ? 'redeem' : event.eventType;

        return {
          timestamp: event.timestamp,
          eventType,
          assetAmountRaw: amountRaw,
          assetSymbol,
          decimals,
          assetLogo,
          inputAssetAmountRaw: isWithdraw ? undefined : amountRaw,
          inputAssetSymbol: isWithdraw ? undefined : assetSymbol,
          inputAssetDecimals: isWithdraw ? undefined : decimals,
          inputAssetLogo: isWithdraw ? undefined : assetLogo,
          outputAssetAmountRaw: isWithdraw ? amountRaw : undefined,
          outputAssetSymbol: isWithdraw ? assetSymbol : undefined,
          outputAssetDecimals: isWithdraw ? decimals : undefined,
          outputAssetLogo: isWithdraw ? assetLogo : undefined,
          chainId,
          transactionHash: event.transactionHash,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private transformToStandard(vault: DetailedVault): StandardOpportunity {
    const apyData = vault.apy?.['30day'] ?? vault.apy?.['7day'] ?? vault.apy?.['1day'];
    const apyPercentage = parseOptionalPercentage(apyData?.total);
    const apyBreakdown = apyData
      ? {
          base: apyData.base * 100,
          reward: apyData.reward * 100,
          total: apyData.total * 100,
        }
      : undefined;
    const tvlUsd = parseOptionalNumber(vault.tvl?.usd);
    const networkName = vault.network?.name || '';
    const chainId = this.toEarnChainId(vault.network?.name);
    const protocolName = vault.protocol?.name || '';

    const addressLower = vault.address.toLowerCase();
    return {
      id: addressLower,
      category: OpportunityCategory.Lend,
      vendor: Vendor.Vaults,
      chainId,
      network: networkName,
      protocol: protocolName,
      token: vault.asset?.symbol || '',
      vaultAddress: addressLower,
      metrics: {
        rawApy: apyPercentage,
        rawTvl: tvlUsd,
        deposited: null,
        depositedUsd: null,
        projectedEarningsUsd: null,
        apyBreakdown,
      },
      name: vault.name,
      tokenIcon: vault.asset?.assetLogo || '',
      tokenNetwork: networkName,
      protocolIcon: vault.protocol?.protocolLogo || '',
      lend: {
        assetSymbol: vault.asset?.symbol,
        assetLogo: vault.asset?.assetLogo,
        assetAddress: vault.asset?.address,
        protocolName,
        protocolLogo: vault.protocol?.protocolLogo,
        networkName,
        description: vault.description,
        stakersCount: vault.holdersData?.totalCount,
        apy30day: vault.apy?.['30day']?.total ? vault.apy['30day'].total * 100 : undefined,
        apy7day: vault.apy?.['7day']?.total ? vault.apy['7day'].total * 100 : undefined,
        tvlUsd: tvlUsd ?? undefined,
      },
    };
  }
}

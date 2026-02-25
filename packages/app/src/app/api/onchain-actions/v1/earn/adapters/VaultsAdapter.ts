import { formatUnits } from 'viem';

import { type DetailedVault, OpportunityCategory } from '@/app-types/earn/vaults';
import { formatAmount } from '@/bridge/util/NumberUtils';

import { parseOptionalNumber, parseOptionalPercentage } from '../lib/metricParsers';
import { DEFAULT_ALLOWED_ASSETS, vaultsSdk } from '../lib/vaultsSdk';
import {
  AvailableActions,
  EARN_CHAIN_ID_TO_NETWORK,
  type EarnChainId,
  HISTORICAL_VENDOR_TTL_SECONDS,
  HistoricalData,
  HistoricalDataPoint,
  type HistoricalTimeRange,
  OpportunityFilters,
  StandardOpportunity,
  StandardTokenContextItem,
  StandardTransactionContext,
  StandardTransactionHistory,
  StandardUserPosition,
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

export class VaultsAdapter implements VendorAdapter {
  vendor = Vendor.Vaults;

  async getOpportunities(filters: OpportunityFilters): Promise<StandardOpportunity[]> {
    const network = filters.chainId ? getEarnNetworkFromChainId(filters.chainId) : undefined;
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
    const network = this.resolveNetwork(chainId);
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
  ): Promise<HistoricalData> {
    const network = this.resolveNetwork(chainId);
    const toTimestamp = Math.floor(Date.now() / 1000);

    // Map UI range to Vaults.fyi time window + granularity
    let fromTimestamp: number;
    let granularity: '1hour' | '1day' | '1week';

    switch (range) {
      case '1d':
        fromTimestamp = toTimestamp - 1 * 24 * 60 * 60;
        granularity = '1hour';
        break;
      case '1m':
        fromTimestamp = toTimestamp - 30 * 24 * 60 * 60;
        granularity = '1day';
        break;
      case '1y':
        fromTimestamp = toTimestamp - 365 * 24 * 60 * 60;
        granularity = '1week';
        break;
      case '7d':
      default:
        fromTimestamp = toTimestamp - 7 * 24 * 60 * 60;
        granularity = '1day';
        break;
    }

    const response = await vaultsSdk.getVaultHistoricalData({
      path: { network, vaultAddress: id },
      query: {
        page: 0,
        perPage: 10,
        apyInterval: '7day',
        fromTimestamp,
        toTimestamp,
        granularity,
      },
    });

    const dataPoints: HistoricalDataPoint[] = response.data
      .map((point) => ({
        timestamp: point.timestamp,
        apy: point.apy?.total ? point.apy.total * 100 : null,
        tvl: point.tvl?.usd ? parseFloat(point.tvl.usd) : null,
        price: null,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const now = Math.floor(Date.now() / 1000);

    return {
      data: dataPoints,
      granularity,
      range,
      fromTimestamp,
      toTimestamp,
      isCached: false,
      lastFetchedAt: now,
      expiresAt: now + HISTORICAL_VENDOR_TTL_SECONDS,
    };
  }

  async getAvailableActions(
    id: string,
    userAddress: string,
    chainId: EarnChainId,
  ): Promise<AvailableActions> {
    const network = this.resolveNetwork(chainId);
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
    const network = this.resolveNetwork(chainId);
    const { action, amount, userAddress, simulate = false } = request;

    const assetAddress =
      request.inputTokenAddress ||
      (await this.getAvailableActions(id, userAddress, chainId)).transactionContext?.asset?.address;

    if (!assetAddress) {
      throw new Error(
        'Asset address is required. Provide inputTokenAddress or ensure available actions context includes asset address.',
      );
    }

    if (action !== 'deposit' && action !== 'redeem') {
      throw new Error(
        `Invalid action for Vaults: ${action}. Only 'deposit' and 'redeem' are supported.`,
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
    const estimatedGasUsd =
      'estimatedGasUsd' in actionsResponse && typeof actionsResponse.estimatedGasUsd === 'string'
        ? actionsResponse.estimatedGasUsd
        : '0';

    return {
      opportunityId: id,
      vendor: Vendor.Vaults,
      action,
      canExecute: transactionSteps.length > 0,
      estimatedGas,
      estimatedGasUsd,
      transactionSteps,
    };
  }

  async getUserPositions(
    userAddress: string,
    chainId: EarnChainId,
  ): Promise<StandardUserPosition[]> {
    const network = this.resolveNetwork(chainId);
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
      const apy = position.apy?.total ? position.apy.total * 100 : undefined;
      const projectedEarningsUsd = apy && valueUsd > 0 ? (valueUsd * apy) / 100 : undefined;

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
    const network = this.resolveNetwork(chainId);
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
        const amountNative = BigInt(event.assetAmountNative || '0');
        const decimals = response.asset.decimals || 18;
        const amountFormatted = formatAmount(Number(formatUnits(amountNative, decimals)), {
          decimals,
          symbol: response.asset.symbol,
        });

        const eventType = event.eventType === 'withdrawal' ? 'redeem' : event.eventType;

        return {
          timestamp: event.timestamp,
          eventType,
          assetAmount: amountFormatted,
          assetSymbol: response.asset.symbol,
          assetLogo: response.asset.assetLogo,
          chainId,
          chainName: network === 'arbitrum' ? 'Arbitrum One' : network,
          transactionHash: event.transactionHash,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private resolveNetwork(chainId: EarnChainId): VaultsNetwork {
    const network = EARN_CHAIN_ID_TO_NETWORK[chainId] as VaultsNetwork | undefined;
    if (!network) {
      throw new Error(`Unsupported chainId for Vaults network mapping: ${chainId}`);
    }
    return network;
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
    const protocolName = vault.protocol?.name || '';

    const addressLower = vault.address.toLowerCase();
    return {
      id: addressLower,
      category: OpportunityCategory.Lend,
      vendor: Vendor.Vaults,
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

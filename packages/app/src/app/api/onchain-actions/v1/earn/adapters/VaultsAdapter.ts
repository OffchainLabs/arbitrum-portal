import { formatUnits } from 'viem';

import { type DetailedVault, OpportunityCategory } from '@/app-types/earn/vaults';
import { formatAmount, formatPercentage, formatTVL } from '@/bridge/util/NumberUtils';

import { DEFAULT_ALLOWED_ASSETS, vaultsSdk } from '../lib/vaultsSdk';
import {
  AvailableActions,
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
} from '../types';

/**
 * Valid network types supported by Vaults SDK
 * Based on @vaultsfyi/sdk allowedNetworks parameter
 */
export type VaultsNetwork = 'mainnet' | 'arbitrum';

/**
 * Valid protocol types supported by Vaults SDK
 * Based on @vaultsfyi/sdk allowedProtocols parameter
 */
export type VaultsProtocol = 'aave' | 'compound' | 'fluid' | 'morpho';

/**
 * Valid action types for Vaults SDK getActions method
 */
export type VaultsActionType = 'deposit' | 'redeem';

export class VaultsAdapter implements VendorAdapter {
  vendor = Vendor.Vaults;

  async getOpportunities(filters: OpportunityFilters): Promise<StandardOpportunity[]> {
    const response = await vaultsSdk.getAllVaults({
      query: {
        allowedNetworks: filters.network ? ([filters.network] as VaultsNetwork[]) : undefined,
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
        const apyDecimal = apyData?.total ?? 0;
        const apyPercentage = apyDecimal * 100;
        return filters.minApy !== undefined && apyPercentage >= filters.minApy;
      });
    }

    return filtered.map((vault) => this.transformToStandard(vault));
  }

  async getOpportunityDetails(
    id: string,
    network: VaultsNetwork = 'arbitrum',
  ): Promise<StandardOpportunity> {
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
    network: VaultsNetwork = 'arbitrum',
  ): Promise<HistoricalData> {
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

  /**
   * Get available actions - "What can I do?"
   * Returns available actions and full transaction context for Vaults.
   *
   * For Vaults: Returns complete transactional context including:
   * - Available deposit/redeem steps
   * - Claimable rewards
   * - Asset and LP token information
   * - Other vault-specific transactional data
   *
   * Fetched once when action panel loads.
   */
  async getAvailableActions(
    id: string,
    userAddress: string,
    network: VaultsNetwork = 'arbitrum',
  ): Promise<AvailableActions> {
    // Get full transaction context from Vaults SDK
    // This includes deposit/redeem steps, claimable rewards, and other vault-specific data
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

  /**
   * Get transaction quote - "How do I execute this?"
   * Returns transaction steps for a specific action with a specific amount.
   * Fetched when user enters amount (debounced).
   */
  async getTransactionQuote(
    id: string,
    request: TransactionQuoteRequest,
    network: VaultsNetwork = 'arbitrum',
  ): Promise<TransactionQuoteResponse> {
    const { action, amount, userAddress, simulate = false } = request;

    const assetAddress =
      request.inputTokenAddress ||
      (await this.getAvailableActions(id, userAddress, network)).transactionContext?.asset?.address;

    if (!assetAddress) {
      throw new Error(
        'Asset address is required. Provide inputTokenAddress or ensure available actions context includes asset address.',
      );
    }

    // Direct call to getActions - no getUserContext needed
    // Validate action is a valid Vaults action type
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

    // Validate actionsResponse structure
    if (!actionsResponse || !actionsResponse.actions || !Array.isArray(actionsResponse.actions)) {
      throw new Error(
        `Invalid actions response: expected actions array. Received: ${JSON.stringify(actionsResponse)}`,
      );
    }

    // Transform to standardized transaction steps
    // Vaults SDK returns: { name: string, tx: { to, chainId, data?, value? } }
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

    // Vaults SDK may not provide gas estimates, use defaults if not available
    const estimatedGas =
      'estimatedGas' in actionsResponse && typeof actionsResponse.estimatedGas === 'string'
        ? actionsResponse.estimatedGas
        : '0';
    const estimatedGasUsd =
      'estimatedGasUsd' in actionsResponse && typeof actionsResponse.estimatedGasUsd === 'string'
        ? actionsResponse.estimatedGasUsd
        : '$0';

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
    network: VaultsNetwork = 'arbitrum',
  ): Promise<StandardUserPosition[]> {
    const response = await vaultsSdk.getPositions({
      path: { userAddress },
      query: { allowedNetworks: [network] },
    });

    // Transform each position using only position data (no vault details fetch)
    return response.data.map((position) => {
      // Use lpToken balance (actual position balance)
      const lpTokenBalanceNative = position.lpToken?.balanceNative || '0';
      const lpTokenBalanceBigInt = BigInt(lpTokenBalanceNative);
      const lpTokenDecimals = position.lpToken?.decimals || 18;

      // Use underlying asset symbol for display (better UX - shows USDC instead of hyperUSDC)
      const assetSymbol = position.asset?.symbol || '';
      const assetAddress = position.asset?.address || '';
      const assetDecimals = position.asset?.decimals || 18;

      // Format LP token balance but display with underlying asset symbol
      const formattedAmount = formatUnits(lpTokenBalanceBigInt, lpTokenDecimals);
      const amountFormatted = formatAmount(parseFloat(formattedAmount), {
        decimals: lpTokenDecimals,
        symbol: assetSymbol, // Use underlying asset symbol (USDC) instead of LP token symbol (hyperUSDC)
      });

      // Extract USD value from lpToken (actual position value)
      const valueUsdString = position.lpToken?.balanceUsd || '$0';
      const valueUsdNumber = parseFloat(valueUsdString.replace(/[^0-9.-]/g, '') || '0');

      // Calculate estimated earnings (APY-based, if available)
      const apy = position.apy?.total ? position.apy.total * 100 : undefined;
      const estimatedEarningsUsdNumber =
        apy && valueUsdNumber > 0 ? (valueUsdNumber * apy) / 100 : undefined; // Annual earnings
      const estimatedEarningsUsd = estimatedEarningsUsdNumber
        ? `$${estimatedEarningsUsdNumber.toFixed(2)}`
        : undefined;

      return {
        opportunityId: position.address, // Vault address
        category: OpportunityCategory.Lend,
        vendor: Vendor.Vaults,
        network: position.network?.name || network,
        amount: lpTokenBalanceNative, // Raw LP token balance (for calculations)
        amountFormatted, // Display formatted as underlying asset (e.g., "0.0001 USDC")
        valueUsd: valueUsdString,
        valueUsdNumber,
        tokenAddress: assetAddress, // Underlying asset address
        tokenSymbol: assetSymbol, // Underlying asset symbol (e.g., "USDC")
        tokenDecimals: assetDecimals, // Underlying asset decimals
        tokenIcon: position.asset?.assetLogo, // Use underlying asset icon for display
        apy,
        estimatedEarningsUsd,
        estimatedEarningsUsdNumber,
        opportunity: {
          id: position.address,
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
    network: VaultsNetwork = 'arbitrum',
  ): Promise<StandardTransactionHistory[]> {
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

        // Map eventType: 'deposit' | 'withdrawal' -> 'deposit' | 'redeem'
        const eventType = event.eventType === 'withdrawal' ? 'redeem' : event.eventType;

        return {
          timestamp: event.timestamp,
          eventType,
          assetAmount: amountFormatted,
          assetSymbol: response.asset.symbol,
          assetLogo: response.asset.assetLogo,
          chainId: this.getChainId(network),
          chainName: network === 'arbitrum' ? 'Arbitrum One' : network,
          transactionHash: event.transactionHash,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private getChainId(network: string): number {
    const chainIdMap: Record<string, number> = {
      arbitrum: 42161,
      mainnet: 1,
    };
    return chainIdMap[network] || 42161;
  }

  private transformToStandard(vault: DetailedVault): StandardOpportunity {
    const apyData = vault.apy?.['30day'] ?? vault.apy?.['7day'] ?? vault.apy?.['1day'];
    const apyDecimal = apyData?.total ?? 0;
    const apyPercentage = apyDecimal * 100;
    const tvlUsd = parseFloat(vault.tvl?.usd || '0');
    const networkName = vault.network?.name || '';
    const protocolName = vault.protocol?.name || '';

    return {
      id: vault.address,
      category: OpportunityCategory.Lend,
      vendor: Vendor.Vaults,
      network: networkName,
      protocol: protocolName,
      token: vault.asset?.symbol || '',
      vaultAddress: vault.address,
      metrics: {
        rawApy: apyPercentage,
        rawTvl: tvlUsd,
        deposited: '-',
        depositedUsd: '-',
        earnings: '-',
        earningsUsd: '-',
      },
      name: vault.name,
      tokenIcon: vault.asset?.assetLogo || '',
      tokenNetwork: networkName,
      protocolIcon: vault.protocol?.protocolLogo || '',
      apyFormatted: formatPercentage(apyPercentage),
      tvlFormatted: formatTVL(tvlUsd),
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
        tvlUsd,
      },
    };
  }
}

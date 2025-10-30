// Vaults SDK integration
import { VaultsSdk } from '@vaultsfyi/sdk';

import { DetailedVault, OpportunityTableRow, UserPosition } from '../types/vaults';

// Initialize SDK
if (!process.env.NEXT_PUBLIC_VAULTS_FYI_API_KEY) {
  throw new Error('NEXT_PUBLIC_VAULTS_FYI_API_KEY is not set');
}

export const vaultsSdk = new VaultsSdk({
  apiKey: process.env.NEXT_PUBLIC_VAULTS_FYI_API_KEY,
});

/**
 * Fetch all detailed vaults using the SDK
 */
export async function getAllVaults({
  // allowedNetworks = [],
  perPage = 50,
}: {
  // allowedNetworks: string[];
  perPage: number;
}): Promise<DetailedVault[]> {
  const response = await vaultsSdk.getAllVaults({
    query: {
      allowedNetworks: ['arbitrum'],
      allowedProtocols: ['aave', 'compound', 'fluid', 'morpho'],
      perPage,
    },
  });

  return response.data;
}

/**
 * Fetch user positions using the SDK
 */
export async function getUserPositions({
  userAddress,
  // allowedNetworks,
}: {
  userAddress: string;
  // allowedNetworks: string[];
}): Promise<UserPosition[]> {
  const response = await vaultsSdk.getPositions({
    path: {
      userAddress,
    },
    query: {
      allowedNetworks: ['arbitrum'],
    },
  });

  return response.data;
}

/**
 * Fetch transaction context for a specific vault interaction
 */
export async function getTransactionsContext({
  userAddress,
  network,
  vaultAddress,
}: {
  userAddress: string;
  network: string;
  vaultAddress: string;
}) {
  const response = await vaultsSdk.getTransactionsContext({
    path: {
      userAddress,
      network: network as any,
      vaultAddress,
    },
  });

  return response;
}

/**
 * Get available actions for a vault interaction
 */
export async function getActions({
  action,
  userAddress,
  network,
  vaultAddress,
  amount,
  assetAddress,
  simulate = false,
  all = false,
}: {
  action: 'deposit' | 'redeem';
  userAddress: string;
  network: string;
  vaultAddress: string;
  amount: string;
  assetAddress: string;
  simulate?: boolean;
  all?: boolean;
}) {
  const response = await vaultsSdk.getActions({
    path: {
      action,
      userAddress,
      network: network as any,
      vaultAddress,
    },
    query: {
      assetAddress,
      amount,
      simulate,
      all,
    },
  });
  return response;
}

/**
 * Fetch a single vault by address and network using the SDK
 */
export async function getVault(
  vaultAddress: string,
  network: string = 'arbitrum',
): Promise<DetailedVault> {
  const response = await vaultsSdk.getVault({
    path: {
      network: network as any, // SDK expects specific network names
      vaultAddress,
    },
  });

  return response;
}

/**
 * Fetch total returns for a specific user and vault
 */
export async function getUserVaultTotalReturns(
  userAddress: string,
  network: string,
  vaultAddress: string,
): Promise<{
  address: string;
  assetCaip: string;
  name: string;
  symbol: string;
  decimals: number;
  assetLogo?: string;
  assetPriceInUsd?: string;
  assetGroup: string;
  returnsNative: string;
}> {
  const response = await vaultsSdk.getUserVaultTotalReturns({
    path: {
      userAddress,
      network: network as any,
      vaultAddress,
    },
  });

  return response;
}

/**
 * Fetch holder events (deposits, withdrawals) for a specific user and vault
 */
export type VaultHolderEventsResponse = {
  asset: {
    address: string;
    assetCaip: string;
    name: string;
    symbol: string;
    decimals: number;
    assetLogo?: string;
    assetPriceInUsd?: string;
    assetGroup: string;
  };
  lpToken: {
    address: string;
    tokenCaip: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  data: Array<{
    timestamp: number;
    blockNumber: string;
    eventType: 'deposit' | 'withdrawal';
    assetAmountNative: string;
    sharePrice: number;
    lpTokenAmount: string;
    transactionHash: string;
    logIndex: number;
  }>;
  items: number;
};

export async function getVaultHolderEvents({
  userAddress,
  network,
  vaultAddress,
}: {
  userAddress: string;
  network: string;
  vaultAddress: string;
}): Promise<VaultHolderEventsResponse> {
  const response = await vaultsSdk.getUserVaultEvents({
    path: {
      userAddress,
      network: network as any,
      vaultAddress,
    },
  });

  return response;
}

/**
 * Transform a vault to an opportunity row
 */
export function transformVaultToOpportunity(
  vault: DetailedVault,
  position?: UserPosition,
): OpportunityTableRow {
  const vaultType = categorizeVaultType(vault);

  // Convert APY from decimal to percentage (e.g., 0.0268 -> 2.68%)
  const apyDecimal =
    vault.apy?.['30day']?.total ?? vault.apy?.['7day']?.total ?? vault.apy?.['1day']?.total ?? 0;
  const apyPercentage = apyDecimal * 100;

  // For user positions, calculate deposited and earnings
  let deposited = '-';
  let depositedUsd = '-';
  let earnings = '-';
  let earningsUsd = '-';

  if (position) {
    // Deposited amount in asset units
    const depositedAmount = parseFloat(position.asset.balanceNative || '0');
    deposited = `${depositedAmount.toFixed(4)} ${vault.asset.symbol}`;
    depositedUsd = formatUSD(parseFloat(position.asset.balanceUsd || '0'));

    // Earnings calculation using the percentage APY
    const estimatedEarnings = parseFloat(position.asset.balanceUsd || '0') * (apyPercentage / 100);
    earnings = `${apyPercentage.toFixed(2)}%`;
    earningsUsd = formatUSD(estimatedEarnings);
  }

  // Format network name properly
  const networkName =
    vault.network.name === 'mainnet'
      ? 'Ethereum'
      : vault.network.name.charAt(0).toUpperCase() + vault.network.name.slice(1);

  // Format protocol name (capitalize first letter)
  const protocolName = vault.protocol.name.charAt(0).toUpperCase() + vault.protocol.name.slice(1);

  // Parse TVL safely
  const tvlUsd = parseFloat(vault.tvl?.usd ?? '0');

  return {
    id: vault.address,
    name: vault.name,
    type: vaultType,
    token: vault.asset.symbol,
    tokenIcon: vault.asset.assetLogo || '',
    tokenNetwork: networkName,
    apy: formatAPY(apyPercentage),
    deposited,
    depositedUsd,
    earnings,
    earningsUsd,
    tvl: formatTVL(tvlUsd),
    protocol: protocolName,
    protocolIcon: vault.protocol.protocolLogo || '',
    vaultAddress: vault.address,
    rawApy: apyPercentage,
    rawTvl: tvlUsd,
  };
}

/**
 * Categorize vault type based on tags and properties
 */
export function categorizeVaultType(vault: DetailedVault): string {
  const tags = vault.tags;
  const tagLower = tags.map((t) => t.toLowerCase());

  // Check for liquid staking
  if (tagLower.some((t) => t.includes('liquid') || t.includes('staking') || t.includes('lsd'))) {
    return 'Liquid Staking';
  }

  // Check for lending
  if (
    vault.lendUrl ||
    tagLower.some((t) => t.includes('lend') || t.includes('aave') || t.includes('compound'))
  ) {
    return 'Lend';
  }

  // Check for fixed yield / pendle
  if (tagLower.some((t) => t.includes('fixed') || t.includes('pendle') || t.includes('yield'))) {
    return 'Fixed Yield';
  }

  // Default fallback
  return 'Other';
}

/**
 * Format large numbers for display (e.g., "108.6M ETH")
 */
export function formatTVL(tvl: number): string {
  if (tvl >= 1e12) {
    return `$${(tvl / 1e12).toFixed(1)}T`;
  }
  if (tvl >= 1e9) {
    return `$${(tvl / 1e9).toFixed(1)}B`;
  }
  if (tvl >= 1e6) {
    return `$${(tvl / 1e6).toFixed(1)}M`;
  }
  if (tvl >= 1e3) {
    return `$${(tvl / 1e3).toFixed(1)}K`;
  }
  return `$${tvl.toFixed(2)}`;
}

/**
 * Format APY for display
 */
export function formatAPY(apy: number): string {
  // Handle very small APY values
  if (apy < 0.01) {
    return `${apy.toFixed(4)}%`;
  }
  if (apy < 1) {
    return `${apy.toFixed(3)}%`;
  }
  return `${apy.toFixed(2)}%`;
}

/**
 * Format USD value
 */
export function formatUSD(value: number): string {
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

// Types extracted from @vaultsfyi/sdk for type safety
import { VaultsSdk } from '@vaultsfyi/sdk';

// Extract the return type of getAllVaults from the SDK
export type VaultsSdkInstance = InstanceType<typeof VaultsSdk>;
export type GetAllVaultsResponse = Awaited<ReturnType<VaultsSdkInstance['getAllVaults']>>;
export type GetPositionsResponse = Awaited<ReturnType<VaultsSdkInstance['getPositions']>>;

// Extract individual vault type from the SDK response
export type DetailedVault = GetAllVaultsResponse['data'][0];

// Extract user position type from the SDK response
export type UserPosition = GetPositionsResponse['data'][0];

// Re-export the opportunity table row type
export interface OpportunityTableRow {
  id: string;
  name: string; // Vault name,
  type: string; // Position type: "Liquid Staking", "Fixed Yield", "Lend"
  token: string; // Token symbol
  tokenIcon: string; // Token logo URL
  tokenNetwork: string; // Network name
  apy: string; // Formatted APY
  deposited: string; // Deposited amount (only for user positions)
  depositedUsd: string; // Deposited USD value (only for user positions)
  earnings: string; // Earnings (only for user positions)
  earningsUsd: string; // Earnings USD (only for user positions)
  tvl: string; // Formatted TVL
  protocol: string; // Protocol name
  protocolIcon: string; // Protocol logo URL
  vaultAddress: string; // Underlying vault address (vendor-specific)
  rawApy: number; // Raw APY for sorting
  rawTvl: number; // Raw TVL for sorting
}

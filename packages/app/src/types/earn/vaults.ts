import { VaultsSdk } from '@vaultsfyi/sdk';

export type VaultsSdkInstance = InstanceType<typeof VaultsSdk>;
export type GetAllVaultsResponse = Awaited<ReturnType<VaultsSdkInstance['getAllVaults']>>;
export type GetPositionsResponse = Awaited<ReturnType<VaultsSdkInstance['getPositions']>>;

export type DetailedVault = GetAllVaultsResponse['data'][0];
export type UserPosition = GetPositionsResponse['data'][0];

export type OpportunityCategory = 'lend';

export function getCategoryDisplayName(category: OpportunityCategory): string {
  return category === 'lend' ? 'Lending' : category;
}

export interface OpportunityTableRow {
  id: string;
  name: string;
  category: OpportunityCategory;
  token: string;
  tokenIcon: string;
  tokenNetwork: string;
  apy: string;
  apyBreakdown?: {
    base: number;
    reward: number;
    total: number;
  };
  deposited: string;
  depositedUsd: string;
  earnings: string;
  earningsUsd: string;
  tvl: string;
  protocol: string;
  protocolIcon: string;
  vaultAddress: string;
  rawApy: number;
  rawTvl: number;
  maturityDate?: string;
}

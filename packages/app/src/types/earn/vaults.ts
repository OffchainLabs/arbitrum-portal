import { VaultsSdk } from '@vaultsfyi/sdk';

import type { EarnChainId } from '@/earn-api/types';

export type VaultsSdkInstance = InstanceType<typeof VaultsSdk>;
export type GetAllVaultsResponse = Awaited<ReturnType<VaultsSdkInstance['getAllVaults']>>;
export type GetPositionsResponse = Awaited<ReturnType<VaultsSdkInstance['getPositions']>>;

export type DetailedVault = GetAllVaultsResponse['data'][0];
export type UserPosition = GetPositionsResponse['data'][0];

export const OpportunityCategory = {
  Lend: 'lend',
  LiquidStaking: 'liquid-staking',
  FixedYield: 'fixed-yield',
} as const;
export type OpportunityCategory = (typeof OpportunityCategory)[keyof typeof OpportunityCategory];

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [OpportunityCategory.Lend];

export function getCategoryDisplayName(category: OpportunityCategory): string {
  const displayNames: Record<OpportunityCategory, string> = {
    [OpportunityCategory.Lend]: 'Lending',
    [OpportunityCategory.LiquidStaking]: 'Liquid Staking',
    [OpportunityCategory.FixedYield]: 'Fixed Yield',
  };
  return displayNames[category] ?? category;
}

export const CATEGORY_INDICATOR_CLASS: Record<OpportunityCategory, string> = {
  [OpportunityCategory.Lend]: 'bg-earn-lend',
  [OpportunityCategory.FixedYield]: 'bg-earn-fixed-yield',
  [OpportunityCategory.LiquidStaking]: 'bg-earn-liquid-staking',
};

export interface OpportunityTableRow {
  id: string;
  chainId: EarnChainId;
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
  deposited: string | null;
  depositedUsd: number | null;
  projectedEarningsUsd: number | null;
  tvl: string;
  protocol: string;
  protocolIcon: string;
  vaultAddress: string;
  rawApy: number | null;
  rawTvl: number | null;
  maturityDate?: string;
}

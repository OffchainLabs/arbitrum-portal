import { VaultsSdk } from '@vaultsfyi/sdk';

export type VaultsSdkInstance = InstanceType<typeof VaultsSdk>;
export type GetAllVaultsResponse = Awaited<ReturnType<VaultsSdkInstance['getAllVaults']>>;
export type GetPositionsResponse = Awaited<ReturnType<VaultsSdkInstance['getPositions']>>;

export type DetailedVault = GetAllVaultsResponse['data'][0];
export type UserPosition = GetPositionsResponse['data'][0];

export enum OpportunityCategory {
  Lend = 'lend',
  LiquidStaking = 'liquid-staking',
  FixedYield = 'fixed-yield',
}

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [OpportunityCategory.Lend];

export function getCategoryDisplayName(category: OpportunityCategory): string {
  const displayNames: Record<OpportunityCategory, string> = {
    [OpportunityCategory.Lend]: 'Lending',
    [OpportunityCategory.LiquidStaking]: 'Liquid Staking',
    [OpportunityCategory.FixedYield]: 'Fixed Yield',
  };
  return displayNames[category] ?? category;
}

export function normalizeOpportunityCategory(
  category: string | null | undefined,
): OpportunityCategory | null {
  if (!category) {
    return null;
  }

  const normalized = category.toLowerCase().trim().replace(/\s+/g, '-');

  if (normalized === OpportunityCategory.Lend || normalized === 'lending') {
    return OpportunityCategory.Lend;
  }
  if (
    normalized === OpportunityCategory.LiquidStaking ||
    normalized === 'liquid_staking' ||
    normalized === 'liquidstaking'
  ) {
    return OpportunityCategory.LiquidStaking;
  }
  if (
    normalized === OpportunityCategory.FixedYield ||
    normalized === 'fixed_yield' ||
    normalized === 'fixedyield'
  ) {
    return OpportunityCategory.FixedYield;
  }

  return null;
}

export const CATEGORY_INDICATOR_CLASS: Record<OpportunityCategory, string> = {
  [OpportunityCategory.Lend]: 'bg-earn-lend',
  [OpportunityCategory.FixedYield]: 'bg-earn-fixed-yield',
  [OpportunityCategory.LiquidStaking]: 'bg-earn-liquid-staking',
};

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
  deposited: string | null;
  depositedUsd: number | null;
  projectedEarnings: string | null;
  projectedEarningsUsd: number | null;
  tvl: string;
  protocol: string;
  protocolIcon: string;
  vaultAddress: string;
  rawApy: number | null;
  rawTvl: number | null;
  maturityDate?: string;
}

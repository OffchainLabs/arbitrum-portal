import { BigNumber } from 'ethers';

import type { StandardOpportunityLend } from '@/earn-api/types';
import { LIQUID_STAKING_OPPORTUNITIES } from '@/earn-api/lib/liquidStaking';

export function parseMetricNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

export function formatApyBreakdown(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : '—';
}

export function formatApr(apy: number | undefined) {
  if (apy == null || !Number.isFinite(apy)) {
    return '—';
  }
  return `${(apy * 100).toFixed(2)}%`;
}

export function deriveVault(opportunity: StandardOpportunityLend) {
  return {
    address: opportunity.id,
    chainId: opportunity.chainId,
    asset: {
      symbol: opportunity.lend?.assetSymbol ?? '',
      address: opportunity.lend?.assetAddress ?? '',
      assetLogo: opportunity.lend?.assetLogo,
    },
    name: opportunity.name,
    protocol: {
      name: opportunity.lend?.protocolName ?? opportunity.protocol,
      protocolLogo: opportunity.lend?.protocolLogo,
    },
    apy: opportunity.lend?.apy7day != null ? opportunity.lend.apy7day / 100 : undefined,
  };
}

interface ActionBalance {
  balanceRaw: BigNumber;
  decimals: number;
  balanceUsd: string | undefined;
}

export function getSelectedActionValues(
  selectedAction: 'supply' | 'withdraw',
  asset: ActionBalance,
  lpToken: ActionBalance,
) {
  const isSupply = selectedAction === 'supply';
  const balanceRaw = isSupply ? asset.balanceRaw : lpToken.balanceRaw;
  const decimals = isSupply ? asset.decimals : lpToken.decimals;
  return {
    balanceRaw,
    decimals,
    usdValue: parseFloat((isSupply ? asset.balanceUsd : lpToken.balanceUsd) ?? '0'),
  };
}

export function sanitizeOutputTokenAddress(tokenAddress: string) {
  const lowercased = tokenAddress.toLowerCase();
  const match = LIQUID_STAKING_OPPORTUNITIES.find(
    (opp) => opp.id.toLowerCase() === lowercased,
  );
  return match ? lowercased : null;
}

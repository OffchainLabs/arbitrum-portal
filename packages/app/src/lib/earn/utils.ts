import { BigNumber, constants } from 'ethers';
import { type Address, getAddress } from 'viem';

import { addressesEqual } from '@/bridge/util/AddressUtils';
import { LIQUID_STAKING_OPPORTUNITIES } from '@/earn-api/lib/liquidStaking';
import type { StandardOpportunityLend } from '@/earn-api/types';

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
  const match = LIQUID_STAKING_OPPORTUNITIES.find((opp) => addressesEqual(opp.id, tokenAddress));
  return match ? match.id.toLowerCase() : null;
}

export function normalizeTokenAddress(tokenAddress: string | null): Address | undefined {
  if (!tokenAddress || addressesEqual(tokenAddress, constants.AddressZero)) {
    return undefined;
  }

  try {
    return getAddress(tokenAddress);
  } catch {
    return undefined;
  }
}

export function getLiquidStakingHistoryValues({
  selectedAction,
  submittedAmountRaw,
  quoteReceiveAmount,
  currentSymbol,
  currentDecimals,
  currentLogoUrl,
  outputTokenSymbol,
  outputTokenIcon,
  selectedSellToken,
}: {
  selectedAction: 'buy' | 'sell';
  submittedAmountRaw: string;
  quoteReceiveAmount: string | undefined;
  currentSymbol: string;
  currentDecimals: number;
  currentLogoUrl?: string;
  outputTokenSymbol: string;
  outputTokenIcon?: string;
  selectedSellToken?: {
    symbol: string;
    decimals: number;
    logoUrl?: string;
  };
}) {
  const hasReceiveAmount = Boolean(quoteReceiveAmount && /^\d+$/.test(quoteReceiveAmount));

  if (!hasReceiveAmount) {
    return {
      hasReceiveAmount,
      inputAssetLogo: currentLogoUrl || outputTokenIcon,
      historyAmountRaw: submittedAmountRaw,
      historyTokenSymbol: currentSymbol,
      historyTokenDecimals: currentDecimals,
      historyAssetLogo: outputTokenIcon,
    };
  }

  if (selectedAction === 'buy') {
    return {
      hasReceiveAmount,
      inputAssetLogo: currentLogoUrl || outputTokenIcon,
      historyAmountRaw: quoteReceiveAmount || submittedAmountRaw,
      historyTokenSymbol: outputTokenSymbol,
      historyTokenDecimals: 18,
      historyAssetLogo: outputTokenIcon,
    };
  }

  return {
    hasReceiveAmount,
    inputAssetLogo: outputTokenIcon,
    historyAmountRaw: quoteReceiveAmount || submittedAmountRaw,
    historyTokenSymbol: selectedSellToken?.symbol ?? currentSymbol,
    historyTokenDecimals: selectedSellToken?.decimals ?? currentDecimals,
    historyAssetLogo: selectedSellToken?.logoUrl || outputTokenIcon,
  };
}

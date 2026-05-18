import { BigNumber, constants } from 'ethers';
import { type Address, getAddress } from 'viem';

import { addressesEqual } from '@/bridge/util/AddressUtils';
import { LIQUID_STAKING_OPPORTUNITIES } from '@/earn-api/lib/liquidStaking';
import type { StandardOpportunityLend } from '@/earn-api/types';

export function parseFiniteNumber(value: unknown, opts: { min?: number } = {}): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (opts.min !== undefined && parsed < opts.min) return null;
  return parsed;
}

export function parseMetricNumber(value: number | null | undefined): number | null {
  return parseFiniteNumber(value, { min: 0 });
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

// Prefers `tokenPriceUsd`; falls back to `currentUsdValue / currentBalanceAmount`.
export function getEarnInputUsdValue(params: {
  amount: string;
  tokenPriceUsd?: number | null;
  currentBalanceAmount?: number;
  currentUsdValue?: number;
}): number | null {
  const { amount, tokenPriceUsd, currentBalanceAmount, currentUsdValue } = params;
  const amountNumber = Number(amount);
  const balanceNumeric =
    typeof currentBalanceAmount === 'number' && Number.isFinite(currentBalanceAmount)
      ? currentBalanceAmount
      : 0;
  const perUnitUsd =
    typeof tokenPriceUsd === 'number' && Number.isFinite(tokenPriceUsd) && tokenPriceUsd > 0
      ? tokenPriceUsd
      : balanceNumeric > 0 && currentUsdValue != null
        ? currentUsdValue / balanceNumeric
        : null;
  if (perUnitUsd == null) return null;
  return Math.max(0, Number.isFinite(amountNumber) ? amountNumber : 0) * perUnitUsd;
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

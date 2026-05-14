'use client';

import dayjs from 'dayjs';
import { BigNumber } from 'ethers';

import type { StandardOpportunityFixedYield } from '@/earn-api/types';

import { type EarnTokenOption } from '../../components/earn/earnTokenDropdownOptions';

export type PendleAction = 'enter' | 'exit' | 'redeem' | 'rollover';

export function formatPendleReceiveAmount(
  receiveAmountRaw: string,
  decimals: number,
  formatAmount: (amount: BigNumber, options: { decimals: number }) => string,
): string | null {
  try {
    const amount = BigNumber.from(receiveAmountRaw);
    if (amount.isZero()) {
      return '0';
    }

    const formatted = formatAmount(amount, { decimals });
    return formatted === '0' ? '< 0.00001' : formatted;
  } catch {
    return null;
  }
}

export function getPendleUnderlyingSymbol(opportunity: StandardOpportunityFixedYield): string {
  const name = opportunity.name?.replace(/^PT\s+/i, '').trim();
  if (name) {
    return name;
  }

  return opportunity.token || 'Asset';
}

export function getPendleRolloverLabel(expiry: string | undefined) {
  if (!expiry) {
    return 'No maturity date';
  }

  const expiryDate = dayjs(expiry);
  if (!expiryDate.isValid()) {
    return expiry;
  }

  const days = Math.max(expiryDate.startOf('day').diff(dayjs().startOf('day'), 'day'), 0);
  return `${expiryDate.format('D MMM YYYY')} (${days} days)`;
}

export function getPendleSettlementTokens(
  opportunity: StandardOpportunityFixedYield,
): EarnTokenOption[] {
  const apiTokens = opportunity.fixedYield.settlementTokens;
  if (apiTokens?.length) {
    return apiTokens.map((token) => ({
      symbol: token.symbol,
      address: token.address,
      decimals: token.decimals,
      logoUrl: token.logoUrl || '',
    }));
  }

  return [];
}

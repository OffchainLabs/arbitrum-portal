import { BigNumber, utils } from 'ethers';

import type { RouteCost } from '@/bridge/app/api/crosschain-transfers/types';

export function parseAmount(amount: string, decimals: number): string | undefined {
  if (!/^\d*(\.\d*)?$/.test(amount) || !/\d/.test(amount)) return;
  try {
    const value = utils.parseUnits(amount, decimals);
    return value.gt(0) ? value.toString() : undefined;
  } catch {
    return;
  }
}

export function costUsd(costs: RouteCost[], prices: Record<string, number>): number | undefined {
  let sum = 0;
  for (const cost of costs) {
    if (cost.amount === '0') continue;
    if (cost.amountUSD !== undefined) {
      const value = Number(cost.amountUSD);
      if (!Number.isFinite(value)) return;
      sum += value;
      continue;
    }
    const price = prices[`${cost.chainId}:${cost.token.address.toLowerCase()}`];
    if (price === undefined) return;
    sum += Number(utils.formatUnits(cost.amount, cost.token.decimals)) * price;
  }
  return sum;
}

export function spendableBalance({
  balance,
  gas,
  fee,
}: {
  balance: string;
  gas: string[];
  fee: string[];
}) {
  const total = (amounts: string[]) =>
    amounts.reduce((sum, amount) => sum.add(amount), BigNumber.from(0));
  const reserve = total(gas).mul(14).add(9).div(10).add(total(fee));
  const available = BigNumber.from(balance);
  return available.gt(reserve) ? available.sub(reserve).toString() : '0';
}

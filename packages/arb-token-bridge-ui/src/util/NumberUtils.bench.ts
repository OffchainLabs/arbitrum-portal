import { BigNumber } from 'ethers';
import { bench, describe } from 'vitest';

import { formatAmount, formatCompactUsd, formatUSD } from './NumberUtils';

// One value per row of a long token list, spread across the formatting branches of formatAmount
const count = 1_000;
// From 0.0007 to 7,919,000, about a quarter of them below 1
const values = Array.from(
  { length: count },
  (_, index) => (((index + 1) * 7919) % 100_000_000) / 10 ** (index % 9),
);
const balances = values.map((value) => BigNumber.from(Math.round(value * 1e8)).mul(1e10));

describe('number formatting', () => {
  bench(`formatAmount, ${count} numbers`, () => {
    values.forEach((value) => formatAmount(value, { symbol: 'ETH' }));
  });

  bench(`formatAmount, ${count} BigNumber balances`, () => {
    balances.forEach((balance) => formatAmount(balance, { decimals: 18, symbol: 'USDC' }));
  });

  bench(`formatUSD, ${count} numbers`, () => {
    values.forEach((value) => formatUSD(value));
  });

  bench(`formatCompactUsd, ${count} numbers`, () => {
    values.forEach((value) => formatCompactUsd(value));
  });
});

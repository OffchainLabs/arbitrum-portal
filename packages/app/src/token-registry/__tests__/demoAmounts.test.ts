import { describe, expect, it } from 'vitest';

import {
  costUsd,
  parseAmount,
  spendableBalance,
} from '../../app/token-registry-poc/top/demoAmounts';

describe('live bridge amounts', () => {
  it('preserves integer precision for large balances and rejects excess decimals', () => {
    expect(parseAmount('9007199254740993.000001', 6)).toBe('9007199254740993000001');
    expect(parseAmount('0.0000001', 6)).toBeUndefined();
    expect(parseAmount('1e3', 18)).toBeUndefined();
    expect(parseAmount('-1', 18)).toBeUndefined();
    expect(parseAmount('0', 18)).toBeUndefined();
  });
  it('reserves all source-paid gas with the bridge buffer, plus exact provider fees', () => {
    expect(spendableBalance({ balance: '1000', gas: ['100', '50'], fee: ['25'] })).toBe('765');
    expect(spendableBalance({ balance: '1000', gas: ['1'], fee: [] })).toBe('998');
    expect(spendableBalance({ balance: '100', gas: ['100'], fee: [] })).toBe('0');
  });
  it('does not label an unpriced cost as free', () => {
    const cost = {
      amount: '1000000',
      chainId: 1,
      token: { address: '0xabc', symbol: 'TOKEN', decimals: 6 },
      details: { id: 'gas', label: 'Gas', via: 'Bridge' },
    };
    expect(costUsd([cost], {})).toBeUndefined();
    expect(costUsd([cost], { '1:0xabc': 2 })).toBe(2);
    expect(costUsd([{ ...cost, amountUSD: 'invalid' }], {})).toBeUndefined();
    expect(costUsd([{ ...cost, amount: '0' }], {})).toBe(0);
  });
});

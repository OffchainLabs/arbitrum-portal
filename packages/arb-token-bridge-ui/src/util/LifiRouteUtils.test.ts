import { BigNumber, constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import { getLifiTransactionSnapshot } from './LifiRouteUtils';

const token = {
  address: constants.AddressZero,
  decimals: 18,
  logoURI: '',
  symbol: 'ETH',
};

describe('getLifiTransactionSnapshot', () => {
  it('reads a canonical single-step transaction summary', () => {
    const snapshot = getLifiTransactionSnapshot({
      toolsDetails: [{ key: 'relay', name: 'Relay', logoURI: 'relay.svg' }],
      durationMs: 60_000,
      fromAmount: {
        amount: BigNumber.from(100),
        amountUSD: '1',
        token,
      },
      toAmount: {
        amount: BigNumber.from(90),
        amountUSD: '0.9',
        token,
      },
    });

    expect(snapshot?.fromAmount.amount.toString()).toBe('100');
    expect(snapshot?.toAmount.amount.toString()).toBe('90');
    expect(snapshot?.toolsDetails).toHaveLength(1);
  });

  it('reads a legacy transaction summary with singular tool details', () => {
    const toolDetails = { key: 'relay', name: 'Relay', logoURI: 'relay.svg' };
    const snapshot = getLifiTransactionSnapshot({
      toolDetails,
      durationMs: 60_000,
      fromAmount: {
        amount: BigNumber.from(100),
        amountUSD: '1',
        token,
      },
      toAmount: {
        amount: BigNumber.from(90),
        amountUSD: '0.9',
        token,
      },
    });

    expect(snapshot?.durationMs).toBe(60_000);
    expect(snapshot?.toolsDetails).toEqual([toolDetails]);
  });
});

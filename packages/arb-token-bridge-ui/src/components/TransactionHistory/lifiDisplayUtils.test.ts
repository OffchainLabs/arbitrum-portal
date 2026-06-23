import { BigNumber } from 'ethers';
import { describe, expect, it } from 'vitest';

import type { AmountWithToken } from '@/token-bridge-sdk/LifiTransferStarter';

import { getLifiToAmountDisplay } from './lifiDisplayUtils';

const unknownToAmount: AmountWithToken = {
  amount: BigNumber.from(0),
  amountUSD: '0',
  token: {
    address: '0x0000000000000000000000000000000000000000',
    decimals: 0,
    logoURI: '',
    symbol: 'Unknown',
  },
};

describe('getLifiToAmountDisplay', () => {
  it('shows pending for pending LiFi transfers with unknown destination amount', () => {
    expect(getLifiToAmountDisplay({ isPending: true, toAmount: unknownToAmount })).toBe('Pending');
  });

  it('keeps formatting known destination amounts', () => {
    expect(
      getLifiToAmountDisplay({
        isPending: true,
        toAmount: {
          amount: BigNumber.from(990000),
          amountUSD: '0.99',
          token: {
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            logoURI: '',
            symbol: 'USDC',
          },
        },
      }),
    ).toBe('0.99 USDC');
  });
});

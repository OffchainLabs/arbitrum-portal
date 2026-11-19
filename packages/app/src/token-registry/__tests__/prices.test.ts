import { describe, expect, it } from 'vitest';

import type { LifiTokenRegistry } from '../../app/api/crosschain-transfers/lifi/tokens/registry';
import { getTokenPrices } from '../server/prices';

const USDC_ETHEREUM = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const NATIVE = '0x0000000000000000000000000000000000000000';

const registry = Promise.resolve({
  tokensByChain: {
    1: [
      { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', priceUSD: '0.9998' },
      { chainId: 1, address: NATIVE, priceUSD: '3000.5' },
      { chainId: 1, address: '0x00000000000000000000000000000000000000e1', priceUSD: '0' },
    ],
  },
  tokensByChainAndCoinKey: {},
} as unknown as LifiTokenRegistry);

describe('getTokenPrices', () => {
  it('returns the requested prices by token key, and leaves out the tokens without a price', async () => {
    expect(
      await getTokenPrices(
        [
          { chainId: 1, address: USDC_ETHEREUM },
          { chainId: 1, address: '0x00000000000000000000000000000000000000e1' },
          { chainId: 8453, address: NATIVE },
        ],
        registry,
      ),
    ).toEqual({ [`1:${USDC_ETHEREUM}`]: 0.9998 });
  });
});

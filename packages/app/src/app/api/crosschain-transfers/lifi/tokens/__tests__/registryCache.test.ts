import { CoinKey } from '@lifi/sdk';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { GET } from '../route';

await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks');
  Object.defineProperty(globalThis, 'AsyncLocalStorage', {
    configurable: true,
    value: AsyncLocalStorage,
  });
  vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true');
});
const { getTokens } = vi.hoisted(() => ({ getTokens: vi.fn() }));
vi.mock('@lifi/sdk', async (actual) => ({
  ...(await actual<typeof import('@lifi/sdk')>()),
  getTokens,
}));

type CacheValue = { kind: string; data: { body: string } };
const cache = new Map<string, CacheValue>();
afterEach(() => {
  Reflect.deleteProperty(globalThis, '__incrementalCache');
  cache.clear();
});

describe('shared LiFi token registry cache', () => {
  it('reuses one SDK fetch across different chain-pair requests with the real Next cache wrapper', async () => {
    Object.defineProperty(globalThis, '__incrementalCache', {
      configurable: true,
      value: {
        generateSimpleCacheKey: async (key: string) => key,
        get: async (key: string) => ({ value: cache.get(key), isStale: false }),
        set: async (key: string, value: CacheValue) => {
          cache.set(key, value);
        },
      },
    });
    const token = {
      name: 'USD Coin',
      symbol: 'USDC',
      coinKey: CoinKey.USDC,
      decimals: 6,
    };
    getTokens.mockResolvedValue({
      tokens: {
        [ChainId.Ethereum]: [
          { ...token, chainId: ChainId.Ethereum, address: CommonAddress.Ethereum.USDC },
        ],
        [ChainId.ArbitrumOne]: [
          { ...token, chainId: ChainId.ArbitrumOne, address: CommonAddress.ArbitrumOne.USDC },
        ],
        [ChainId.Solana]: [
          { ...token, chainId: ChainId.Solana, address: CommonAddress.Solana.USDC },
        ],
      },
    });
    const request = (parentChainId: number) =>
      new NextRequest(
        'http://localhost/api/crosschain-transfers/lifi/tokens?parentChainId=' +
          parentChainId +
          '&childChainId=' +
          ChainId.ArbitrumOne,
      );
    expect((await GET(request(ChainId.Ethereum))).status).toBe(200);
    expect((await GET(request(ChainId.Solana))).status).toBe(200);
    expect(getTokens).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(1);
  });
});

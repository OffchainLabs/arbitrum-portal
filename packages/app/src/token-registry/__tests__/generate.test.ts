import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCuratedCoinKey, getDefaultDestinationOverride, isExcludedToken } from '../constants';
import {
  CanonicalEntry,
  generateCanonical,
  getDestinationTokensForSource,
  getSelectedTokenAvailability,
  getSourceTokens,
} from '../server/generate';
import { NATIVE_TOKEN_ADDRESS, Token, toTokenId } from '../types';
import { DAI_ARBITRUM, DAI_ETHEREUM } from './fixtures';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: never[]) => unknown) => fn,
}));

const PYUSD_ETHEREUM = '0x6c3ea9036406852006290770bedfcaba0e23a0e8' as Token['address'];
const PYUSD_CANONICAL_ARBITRUM = '0x327006c8712fe0abdbbd55b7999db39b0967342e' as Token['address'];
const PYUSD_LIFI_ARBITRUM = '0x46850ad61c2b7d64d08c9c754f45254596696984' as Token['address'];
const PEPE_ETHEREUM = '0x6982508145454ce325ddbe47a25d4ec3d2311933' as Token['address'];
const PEPE_ARBITRUM = '0x35e6a59f786d9266c7961ea28c7b768b33959cbb' as Token['address'];
const USDC_ETHEREUM = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Token['address'];
const USDC_ROBINHOOD = '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8' as Token['address'];
const SPCX_ROBINHOOD = '0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea' as Token['address'];

function token(chainId: number, address: string, symbol: string): Token {
  return {
    id: toTokenId(chainId, address),
    chainId,
    address: address.toLowerCase() as Token['address'],
    symbol,
    name: symbol,
    decimals: 18,
  };
}

const entries: CanonicalEntry[] = [
  {
    parent: token(1, PYUSD_ETHEREUM, 'PYUSD'),
    child: token(42161, PYUSD_CANONICAL_ARBITRUM, 'PYUSD'),
  },
  {
    parent: token(1, DAI_ETHEREUM, 'DAI'),
    child: token(42161, DAI_ARBITRUM, 'DAI'),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

function mockRegistryFetch() {
  const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input.toString());

    if (url.hostname === 'tokenlist.arbitrum.io') {
      return jsonResponse({
        tokens: [
          {
            chainId: 42161,
            address: PYUSD_CANONICAL_ARBITRUM,
            symbol: 'PYUSD',
            name: 'PayPal USD',
            decimals: 6,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: PYUSD_ETHEREUM },
              },
            },
          },
          {
            chainId: 42161,
            address: PEPE_ARBITRUM,
            symbol: 'PEPE',
            name: 'Pepe',
            decimals: 18,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: PEPE_ETHEREUM },
              },
            },
          },
        ],
      });
    }

    if (url.pathname === '/v1/connections') {
      const fromChainId = Number(url.searchParams.get('fromChain'));
      const toChainId = Number(url.searchParams.get('toChain'));

      if (fromChainId === 4663 && toChainId === 1) {
        return jsonResponse({
          connections: [
            {
              fromChainId: 4663,
              toChainId: 1,
              fromTokens: [
                { chainId: 4663, address: USDC_ROBINHOOD },
                { chainId: 4663, address: SPCX_ROBINHOOD },
              ],
              toTokens: [{ chainId: 1, address: USDC_ETHEREUM }],
            },
          ],
        });
      }

      if (fromChainId !== 1 || toChainId !== 42161) {
        return jsonResponse({ connections: [] });
      }

      return jsonResponse({
        connections: [
          {
            fromChainId: 1,
            toChainId: 42161,
            fromTokens: [
              { chainId: 1, address: PYUSD_ETHEREUM },
              { chainId: 1, address: PEPE_ETHEREUM },
            ],
            toTokens: [
              { chainId: 42161, address: PYUSD_LIFI_ARBITRUM },
              { chainId: 42161, address: PEPE_ARBITRUM },
              { chainId: 42161, address: DAI_ARBITRUM },
            ],
          },
        ],
      });
    }

    if (url.pathname === '/v1/tokens') {
      const chainId = Number(url.searchParams.get('chains'));
      const tokens = {
        1: [
          {
            chainId,
            address: USDC_ETHEREUM,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            coinKey: 'USDC',
          },
          {
            chainId,
            address: PYUSD_ETHEREUM,
            symbol: 'PYUSD',
            name: 'PayPal USD',
            decimals: 6,
          },
          {
            chainId,
            address: PEPE_ETHEREUM,
            symbol: 'PEPE',
            name: 'Pepe',
            decimals: 18,
          },
        ],
        42161: [
          {
            chainId,
            address: PYUSD_LIFI_ARBITRUM,
            symbol: 'PYUSD',
            name: 'PayPal USD',
            decimals: 6,
          },
          {
            chainId,
            address: PEPE_ARBITRUM,
            symbol: 'PEPE',
            name: 'Pepe',
            decimals: 18,
          },
          {
            chainId,
            address: DAI_ARBITRUM,
            symbol: 'DAI',
            name: 'Dai Stablecoin',
            decimals: 18,
          },
        ],
        4663: [
          {
            chainId,
            address: USDC_ROBINHOOD,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            coinKey: 'USDC',
          },
          {
            chainId,
            address: SPCX_ROBINHOOD,
            symbol: 'SPCX',
            name: 'SpaceX',
            decimals: 18,
          },
        ],
      }[chainId];

      return jsonResponse({ tokens: { [String(chainId)]: tokens ?? [] } });
    }

    return new Response(null, { status: 404 });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('isExcludedToken', () => {
  it('excludes the PEPE import-demo token on both chains, case-insensitively', () => {
    expect(isExcludedToken(1, '0x6982508145454ce325ddbe47a25d4ec3d2311933')).toBe(true);
    expect(isExcludedToken(1, '0x6982508145454Ce325dDbE47a25d4ec3d2311933')).toBe(true);
    expect(isExcludedToken(42161, '0x35e6a59f786d9266c7961ea28c7b768b33959cbb')).toBe(true);
  });

  it('leaves every other token alone', () => {
    expect(isExcludedToken(1, DAI_ETHEREUM)).toBe(false);
    expect(isExcludedToken(42161, PYUSD_CANONICAL_ARBITRUM)).toBe(false);
  });
});

describe('getCuratedCoinKey', () => {
  it('assigns coinKeys LiFi does not provide (PYUSD, ENA)', () => {
    expect(getCuratedCoinKey(1, PYUSD_ETHEREUM)).toBe('PYUSD');
    expect(getCuratedCoinKey(42161, PYUSD_LIFI_ARBITRUM)).toBe('PYUSD');
    expect(getCuratedCoinKey(1, '0x57e114B691Db790C35207b2e685D4A43181e6061')).toBe('ENA');
    expect(getCuratedCoinKey(42161, '0x58538e6a46e07434d7e7375bc268d3cb839c0133')).toBe('ENA');
  });

  it('returns undefined for uncurated tokens', () => {
    expect(getCuratedCoinKey(1, DAI_ETHEREUM)).toBeUndefined();
    expect(getCuratedCoinKey(42161, PYUSD_CANONICAL_ARBITRUM)).toBeUndefined();
  });
});

describe('getDefaultDestinationOverride', () => {
  it('defaults Ethereum PYUSD to the LiFi PYUSD on Arbitrum One', () => {
    expect(
      getDefaultDestinationOverride(
        { sourceChainId: 1, destinationChainId: 42161 },
        PYUSD_ETHEREUM,
      ),
    ).toBe(PYUSD_LIFI_ARBITRUM);
  });

  it('does not override canonical PYUSD withdrawals', () => {
    expect(
      getDefaultDestinationOverride(
        { sourceChainId: 42161, destinationChainId: 1 },
        PYUSD_CANONICAL_ARBITRUM,
      ),
    ).toBeUndefined();
  });
});

describe('generateCanonical', () => {
  it('always routes native to native', () => {
    const deposit = generateCanonical(entries, { sourceChainId: 1, destinationChainId: 42161 });
    expect(deposit.routes[NATIVE_TOKEN_ADDRESS]).toBe(NATIVE_TOKEN_ADDRESS);
  });

  it('keeps the PYUSD canonical deposit route', () => {
    const deposit = generateCanonical(entries, { sourceChainId: 1, destinationChainId: 42161 });

    expect(deposit.routes[PYUSD_ETHEREUM]).toBe(PYUSD_CANONICAL_ARBITRUM);
    expect(deposit.routes[DAI_ETHEREUM]).toBe(DAI_ARBITRUM);
  });

  it('keeps the PYUSD canonical withdrawal route', () => {
    const withdrawal = generateCanonical(entries, { sourceChainId: 42161, destinationChainId: 1 });

    expect(withdrawal.routes[PYUSD_CANONICAL_ARBITRUM]).toBe(PYUSD_ETHEREUM);
    expect(withdrawal.routes[DAI_ARBITRUM]).toBe(DAI_ETHEREUM);
  });
});

describe('getSelectedTokenAvailability', () => {
  it('builds one cached pair registry per cache miss', async () => {
    const fetchMock = mockRegistryFetch();

    await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: PYUSD_ETHEREUM,
    });

    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('uses the defined PYUSD routes instead of minting an import-only route', async () => {
    mockRegistryFetch();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: PYUSD_ETHEREUM,
    });

    expect(selection?.destinationToken.id).toBe(toTokenId(42161, PYUSD_LIFI_ARBITRUM));
    expect(selection?.availableRoutes).toEqual(
      expect.arrayContaining([
        {
          provider: 'canonical',
          sourceToken: expect.objectContaining({
            id: toTokenId(1, PYUSD_ETHEREUM),
          }),
          destinationToken: expect.objectContaining({
            id: toTokenId(42161, PYUSD_CANONICAL_ARBITRUM),
          }),
        },
        {
          provider: 'lifi',
          sourceToken: expect.objectContaining({
            id: toTokenId(1, PYUSD_ETHEREUM),
          }),
          destinationToken: expect.objectContaining({
            id: toTokenId(42161, PYUSD_LIFI_ARBITRUM),
          }),
        },
      ]),
    );
  });

  it('selects any LiFi destination without expanding the provider-route list', async () => {
    mockRegistryFetch();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: PYUSD_ETHEREUM,
      destinationTokenAddress: DAI_ARBITRUM,
    });

    expect(selection?.destinationToken.id).toBe(toTokenId(42161, DAI_ARBITRUM));
    expect(selection?.availableRoutes).toHaveLength(2);
    expect(selection?.availableRoutes.map((route) => route.provider)).toEqual([
      'canonical',
      'lifi',
    ]);
  });

  it('supports a Robinhood-only swap token with native destination fallback', async () => {
    mockRegistryFetch();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 4663, destinationChainId: 1 },
      sourceTokenAddress: SPCX_ROBINHOOD,
    });

    expect(selection?.sourceToken).toEqual(
      expect.objectContaining({
        id: toTokenId(4663, SPCX_ROBINHOOD),
        symbol: 'SPCX',
      }),
    );
    expect(selection?.destinationToken.id).toBe(toTokenId(1, NATIVE_TOKEN_ADDRESS));
    expect(selection?.availableRoutes).toEqual([
      expect.objectContaining({
        provider: 'lifi',
        sourceToken: expect.objectContaining({
          id: toTokenId(4663, SPCX_ROBINHOOD),
        }),
      }),
    ]);
  });

  it('allows Robinhood USDC withdrawal but not Ethereum USDC deposit', async () => {
    mockRegistryFetch();

    const withdrawal = await getSelectedTokenAvailability({
      pair: { sourceChainId: 4663, destinationChainId: 1 },
      sourceTokenAddress: USDC_ROBINHOOD,
    });
    const deposit = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 4663 },
      sourceTokenAddress: USDC_ETHEREUM,
    });

    expect(withdrawal?.destinationToken.id).toBe(toTokenId(1, USDC_ETHEREUM));
    expect(withdrawal?.availableRoutes).toEqual([
      expect.objectContaining({
        provider: 'canonical',
        sourceToken: expect.objectContaining({
          id: toTokenId(4663, USDC_ROBINHOOD),
        }),
        destinationToken: expect.objectContaining({
          id: toTokenId(1, USDC_ETHEREUM),
        }),
      }),
    ]);
    expect(deposit).toBeNull();
  });
});

describe('getDestinationTokensForSource', () => {
  it('returns every LiFi destination plus fixed-route destinations', async () => {
    mockRegistryFetch();

    const destinationTokens = await getDestinationTokensForSource({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: PYUSD_ETHEREUM,
    });
    const addresses = destinationTokens?.map((token) => token.address);

    expect(addresses).toEqual(
      expect.arrayContaining([
        NATIVE_TOKEN_ADDRESS,
        DAI_ARBITRUM,
        PYUSD_CANONICAL_ARBITRUM,
        PYUSD_LIFI_ARBITRUM,
      ]),
    );
    expect(addresses).not.toContain(PEPE_ARBITRUM);
  });
});

describe('getSourceTokens', () => {
  it('excludes the PEPE import-demo token from generated picker payloads', async () => {
    mockRegistryFetch();

    const sourceTokens = await getSourceTokens({
      sourceChainId: 1,
      destinationChainId: 42161,
    });

    expect(sourceTokens?.some((token) => token.address === PYUSD_ETHEREUM)).toBe(true);
    expect(sourceTokens?.some((token) => token.address === PEPE_ETHEREUM)).toBe(false);
  });

  it('lists Robinhood one-chain and withdraw-only source tokens only in the withdraw direction', async () => {
    mockRegistryFetch();

    const withdrawalSourceTokens = await getSourceTokens({
      sourceChainId: 4663,
      destinationChainId: 1,
    });
    const depositSourceTokens = await getSourceTokens({
      sourceChainId: 1,
      destinationChainId: 4663,
    });

    expect(withdrawalSourceTokens?.some((token) => token.address === SPCX_ROBINHOOD)).toBe(true);
    expect(withdrawalSourceTokens?.some((token) => token.address === USDC_ROBINHOOD)).toBe(true);
    expect(depositSourceTokens?.some((token) => token.address === USDC_ETHEREUM)).toBe(false);
  });
});

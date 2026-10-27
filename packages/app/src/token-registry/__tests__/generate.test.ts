import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { getCuratedCoinKey, getDefaultDestinationOverride, isExcludedToken } from '../constants';
import {
  CanonicalEntry,
  generateCanonical,
  getDestinationTokensForSource,
  getSelectedTokenAvailability,
  getSourceTokens,
} from '../server/generate';
import {
  NATIVE_TOKEN_ADDRESS,
  PickerTokens,
  SelectedTokenAvailability,
  Token,
  toTokenId,
} from '../types';
import { DAI_ARBITRUM, DAI_ETHEREUM } from './fixtures';

const cacheState = vi.hoisted(() => ({
  entries: new Map<string, unknown>(),
  builtKeys: [] as string[],
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown, keyParts: string[]) => (): unknown => {
    const key = keyParts.join('|');
    if (!cacheState.entries.has(key)) {
      cacheState.builtKeys.push(key);
      cacheState.entries.set(key, fn());
    }
    return cacheState.entries.get(key);
  },
}));

const resolveImportMock = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<SelectedTokenAvailability | null>>(async () => null),
);

vi.mock('../server/resolveImport', () => ({
  resolveImport: (...args: unknown[]) => resolveImportMock(...args),
}));

// Tokens that answer oftVersion() onchain.
const onchainOftTokens = vi.hoisted(() => new Set<string>());
const multicallMock = vi.hoisted(() =>
  vi.fn(async ({ contracts }: { contracts: { address: string }[] }) =>
    contracts.map(({ address }) =>
      onchainOftTokens.has(address)
        ? { status: 'success', result: ['0x02e49c2c', 1n] }
        : { status: 'failure', error: new Error('execution reverted') },
    ),
  ),
);

vi.mock('../server/publicClient', () => ({
  getPublicClient: () => ({ multicall: multicallMock }),
}));

const PYUSD_ETHEREUM = '0x6c3ea9036406852006290770bedfcaba0e23a0e8' as Token['address'];
const PYUSD_CANONICAL_ARBITRUM = '0x327006c8712fe0abdbbd55b7999db39b0967342e' as Token['address'];
const PYUSD_LIFI_ARBITRUM = '0x46850ad61c2b7d64d08c9c754f45254596696984' as Token['address'];
const PEPE_ETHEREUM = '0x6982508145454ce325ddbe47a25d4ec3d2311933' as Token['address'];
const PEPE_ARBITRUM = '0x35e6a59f786d9266c7961ea28c7b768b33959cbb' as Token['address'];
const USDC_ETHEREUM = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Token['address'];
const USDC_E_ARBITRUM = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8' as Token['address'];
const USDC_ARBITRUM = '0xaf88d065e77c8cc2239327c5edb3a432268e5831' as Token['address'];
const USDC_ROBINHOOD = '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8' as Token['address'];
const PYUSD_ROBINHOOD = '0x35a1ec575ee89b1ed4fb23b371e0aaeb2d50cc27' as Token['address'];
const UNBRIDGED_ETHEREUM = '0x1111111111111111111111111111111111111111' as Token['address'];
const UNBRIDGED_ARBITRUM = '0x2222222222222222222222222222222222222222' as Token['address'];
const USDE_ETHEREUM = CommonAddress.Ethereum.USDe.toLowerCase() as Token['address'];
const USDE_ROBINHOOD = CommonAddress.RobinhoodChain.USDe.toLowerCase() as Token['address'];
const GHO_ETHEREUM = '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f' as Token['address'];
const GHO_ARBITRUM = '0xfeb8670b834d9157864126f5dbd24b25d06882ad' as Token['address'];
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
  cacheState.entries.clear();
  cacheState.builtKeys.length = 0;
  resolveImportMock.mockReset();
  resolveImportMock.mockResolvedValue(null);
  onchainOftTokens.clear();
  multicallMock.mockClear();
});

const emptyLayerZeroMetadata = { ethereum: { tokens: {} } };

function pickerAddresses(picker: PickerTokens | null): string[] {
  return [...(picker?.pinnedTokens ?? []), ...(picker?.tokens ?? [])].map((token) => token.address);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

function mockRegistryFetch({
  layerZeroMetadata = emptyLayerZeroMetadata,
}: { layerZeroMetadata?: unknown } = {}) {
  const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input.toString());

    if (url.hostname === 'metadata.layerzero-api.com') {
      return layerZeroMetadata
        ? jsonResponse(layerZeroMetadata)
        : new Response(null, { status: 503 });
    }

    if (url.hostname === 'tokenlist.arbitrum.io' && url.pathname.includes('4663_')) {
      return jsonResponse({
        tokens: [
          {
            chainId: 4663,
            address: USDC_ROBINHOOD,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: USDC_ETHEREUM },
              },
            },
          },
          {
            chainId: 4663,
            address: USDE_ROBINHOOD,
            symbol: 'USDe',
            name: 'USDe',
            decimals: 18,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: USDE_ETHEREUM },
              },
            },
          },
          {
            chainId: 4663,
            address: PYUSD_ROBINHOOD,
            symbol: 'PYUSD',
            name: 'PayPal USD',
            decimals: 6,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: PYUSD_ETHEREUM },
              },
            },
          },
        ],
      });
    }

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
          {
            chainId: 42161,
            address: DAI_ARBITRUM,
            symbol: 'DAI',
            name: 'Dai Stablecoin',
            decimals: 18,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: DAI_ETHEREUM },
              },
            },
          },
          {
            chainId: 42161,
            address: USDC_E_ARBITRUM,
            symbol: 'USDC.e',
            name: 'Bridged USDC',
            decimals: 6,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: USDC_ETHEREUM },
              },
            },
          },
          {
            chainId: 42161,
            address: GHO_ARBITRUM,
            symbol: 'GHO',
            name: 'Gho Token',
            decimals: 18,
            extensions: {
              bridgeInfo: {
                '1': { tokenAddress: GHO_ETHEREUM },
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
              { chainId: 1, address: USDC_ETHEREUM },
              { chainId: 1, address: DAI_ETHEREUM },
              { chainId: 1, address: UNBRIDGED_ETHEREUM },
            ],
            toTokens: [
              { chainId: 42161, address: USDC_ARBITRUM },
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
          {
            chainId,
            address: UNBRIDGED_ETHEREUM,
            symbol: 'NEW',
            name: 'Never Bridged',
            decimals: 18,
          },
        ],
        42161: [
          {
            chainId,
            address: USDC_ARBITRUM,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            coinKey: 'USDC',
          },
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

  it('defaults Ethereum USDC to native USDC on Arbitrum One', () => {
    expect(
      getDefaultDestinationOverride({ sourceChainId: 1, destinationChainId: 42161 }, USDC_ETHEREUM),
    ).toBe(USDC_ARBITRUM);
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
  it('caches token metadata per chain and routes per pair', async () => {
    const fetchMock = mockRegistryFetch();

    await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: PYUSD_ETHEREUM,
    });
    await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 4663 },
    });

    expect([...cacheState.builtKeys].sort()).toEqual([
      'layerzero-metadata',
      'token-registry-chain-1-v3',
      'token-registry-chain-42161-v3',
      'token-registry-chain-4663-v3',
      'token-registry-pair-1->42161-v3',
      'token-registry-pair-1->4663-v3',
    ]);
    const ethereumLifiTokenFetches = fetchMock.mock.calls.filter(([input]) => {
      const url = new URL(input.toString());
      return url.pathname === '/v1/tokens' && url.searchParams.get('chains') === '1';
    });
    expect(ethereumLifiTokenFetches).toHaveLength(1);
  });

  it('defaults Ethereum USDC to the native USDC that LiFi delivers', async () => {
    mockRegistryFetch();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: USDC_ETHEREUM,
    });

    expect(selection?.destinationToken.id).toBe(toTokenId(42161, USDC_ARBITRUM));
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
          batchDeposit: expect.any(Object),
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
    expect(resolveImportMock).not.toHaveBeenCalled();
  });

  it('selects any LiFi destination without expanding the provider-route list', async () => {
    mockRegistryFetch();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: USDC_ETHEREUM,
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
    expect(resolveImportMock).not.toHaveBeenCalled();
  });

  it('derives Robinhood canonical routes from its token list', async () => {
    mockRegistryFetch();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 4663 },
      sourceTokenAddress: PYUSD_ETHEREUM,
    });

    expect(selection?.destinationToken.id).toBe(toTokenId(4663, PYUSD_ROBINHOOD));
    expect(selection?.availableRoutes).toEqual([
      expect.objectContaining({
        provider: 'canonical',
        destinationToken: expect.objectContaining({ id: toTokenId(4663, PYUSD_ROBINHOOD) }),
        batchDeposit: {
          sourceToken: expect.objectContaining({ id: toTokenId(1, NATIVE_TOKEN_ADDRESS) }),
          destinationToken: expect.objectContaining({ id: toTokenId(4663, NATIVE_TOKEN_ADDRESS) }),
        },
      }),
    ]);
  });
});

describe('canonical policy lists', () => {
  it('blocks canonical Robinhood USDe in both directions', async () => {
    mockRegistryFetch();

    const deposit = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 4663 },
      sourceTokenAddress: USDE_ETHEREUM,
    });
    const withdrawal = await getSelectedTokenAvailability({
      pair: { sourceChainId: 4663, destinationChainId: 1 },
      sourceTokenAddress: USDE_ROBINHOOD,
    });

    expect(deposit).toBeNull();
    expect(withdrawal).toBeNull();
  });

  it('blocks canonical deposits of withdraw-only tokens and keeps their withdrawals', async () => {
    mockRegistryFetch();

    const deposit = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: GHO_ETHEREUM,
    });
    const withdrawal = await getSelectedTokenAvailability({
      pair: { sourceChainId: 42161, destinationChainId: 1 },
      sourceTokenAddress: GHO_ARBITRUM,
    });

    expect(deposit).toBeNull();
    expect(resolveImportMock).not.toHaveBeenCalled();
    expect(withdrawal?.availableRoutes).toEqual([
      expect.objectContaining({
        provider: 'canonical',
        destinationToken: expect.objectContaining({ id: toTokenId(1, GHO_ETHEREUM) }),
      }),
    ]);
  });

  it('does not add a canonical route from an import that the policy blocks', async () => {
    mockRegistryFetch();
    const sourceToken = token(4663, USDE_ROBINHOOD, 'USDe');
    const destinationToken = token(1, USDE_ETHEREUM, 'USDe');
    resolveImportMock.mockResolvedValue({
      sourceToken,
      destinationToken,
      availableRoutes: [{ provider: 'canonical', sourceToken, destinationToken }],
    });

    const withdrawal = await getSelectedTokenAvailability({
      pair: { sourceChainId: 4663, destinationChainId: 1 },
      sourceTokenAddress: USDE_ROBINHOOD,
    });

    expect(resolveImportMock).toHaveBeenCalled();
    expect(withdrawal).toBeNull();
  });
});

describe('canonical imports', () => {
  function mockUnbridgedImport() {
    const sourceToken = token(1, UNBRIDGED_ETHEREUM, 'NEW');
    const destinationToken = token(42161, UNBRIDGED_ARBITRUM, 'NEW');
    resolveImportMock.mockResolvedValue({
      sourceToken,
      destinationToken,
      availableRoutes: [{ provider: 'canonical', sourceToken, destinationToken }],
    });
  }

  it('adds the canonical route to a token that only LiFi lists', async () => {
    mockRegistryFetch();
    mockUnbridgedImport();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: UNBRIDGED_ETHEREUM,
    });

    expect(resolveImportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bridge: expect.objectContaining({
          parentChainId: 1,
          childChainId: 42161,
          parentGatewayRouter: '0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef',
        }),
      }),
    );
    expect(selection?.destinationToken.id).toBe(toTokenId(42161, UNBRIDGED_ARBITRUM));
    expect(selection?.availableRoutes.map((route) => route.provider)).toEqual([
      'canonical',
      'lifi',
    ]);
  });

  it('lists the imported canonical destination in the destination picker', async () => {
    mockRegistryFetch();
    mockUnbridgedImport();

    const destinationTokens = await getDestinationTokensForSource({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: UNBRIDGED_ETHEREUM,
    });

    expect(pickerAddresses(destinationTokens)).toContain(UNBRIDGED_ARBITRUM);
  });

  it('skips the import when the registry already has a canonical route', async () => {
    mockRegistryFetch();

    await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: PYUSD_ETHEREUM,
    });

    expect(resolveImportMock).not.toHaveBeenCalled();
  });
});

describe('batch deposits', () => {
  it('lets a canonical deposit carry Ethereum ETH that arrives as Arbitrum One ETH', async () => {
    mockRegistryFetch();

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: DAI_ETHEREUM,
    });
    const canonicalRoute = selection?.availableRoutes.find(
      (route) => route.provider === 'canonical',
    );
    const lifiRoute = selection?.availableRoutes.find((route) => route.provider === 'lifi');

    expect(canonicalRoute?.provider === 'canonical' && canonicalRoute.batchDeposit).toEqual({
      sourceToken: expect.objectContaining({ id: toTokenId(1, NATIVE_TOKEN_ADDRESS) }),
      destinationToken: expect.objectContaining({ id: toTokenId(42161, NATIVE_TOKEN_ADDRESS) }),
    });
    expect(lifiRoute).not.toHaveProperty('batchDeposit');
  });

  it('skips native, excluded, and withdrawal source tokens', async () => {
    mockRegistryFetch();

    const selections = await Promise.all([
      getSelectedTokenAvailability({
        pair: { sourceChainId: 1, destinationChainId: 42161 },
        sourceTokenAddress: NATIVE_TOKEN_ADDRESS,
      }),
      getSelectedTokenAvailability({
        pair: { sourceChainId: 1, destinationChainId: 42161 },
        sourceTokenAddress: USDC_ETHEREUM,
      }),
      getSelectedTokenAvailability({
        pair: { sourceChainId: 42161, destinationChainId: 1 },
        sourceTokenAddress: DAI_ARBITRUM,
      }),
    ]);

    for (const selection of selections) {
      expect(selection?.availableRoutes).toContainEqual(
        expect.objectContaining({ provider: 'canonical' }),
      );
      for (const route of selection?.availableRoutes ?? []) {
        expect(route).not.toHaveProperty('batchDeposit');
      }
    }
  });
});

describe('getDestinationTokensForSource', () => {
  it('returns every LiFi destination plus fixed-route destinations', async () => {
    mockRegistryFetch();

    const destinationTokens = await getDestinationTokensForSource({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: USDC_ETHEREUM,
    });
    const addresses = pickerAddresses(destinationTokens);

    expect(addresses).toEqual(
      expect.arrayContaining([NATIVE_TOKEN_ADDRESS, DAI_ARBITRUM, USDC_E_ARBITRUM, USDC_ARBITRUM]),
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

    expect(sourceTokens?.tokens.some((token) => token.address === PYUSD_ETHEREUM)).toBe(true);
    expect(sourceTokens?.tokens.some((token) => token.address === PEPE_ETHEREUM)).toBe(false);
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

    const withdrawalAddresses = pickerAddresses(withdrawalSourceTokens);
    const depositAddresses = pickerAddresses(depositSourceTokens);

    expect(withdrawalAddresses).toContain(SPCX_ROBINHOOD);
    expect(withdrawalAddresses).toContain(USDC_ROBINHOOD);
    expect(depositAddresses).not.toContain(USDC_ETHEREUM);
  });
});

describe('OFT deposit block', () => {
  const OTHER_DAI_ARBITRUM = '0x3333333333333333333333333333333333333333';

  async function getCanonicalDestination(
    pair: { sourceChainId: number; destinationChainId: number },
    sourceTokenAddress: string,
  ) {
    const selection = await getSelectedTokenAvailability({ pair, sourceTokenAddress });
    return selection?.availableRoutes.find((route) => route.provider === 'canonical')
      ?.destinationToken?.address;
  }

  it('blocks the deposit of a token that LayerZero does not list but answers oftVersion()', async () => {
    mockRegistryFetch();
    onchainOftTokens.add(DAI_ETHEREUM);

    expect(
      await getCanonicalDestination({ sourceChainId: 1, destinationChainId: 42161 }, DAI_ETHEREUM),
    ).toBeUndefined();
    expect(
      await getCanonicalDestination({ sourceChainId: 42161, destinationChainId: 1 }, DAI_ARBITRUM),
    ).toBe(DAI_ETHEREUM);
  });

  it('checks each Ethereum parent token onchain once for every pair', async () => {
    mockRegistryFetch();

    await getSelectedTokenAvailability({ pair: { sourceChainId: 1, destinationChainId: 42161 } });
    await getSelectedTokenAvailability({ pair: { sourceChainId: 1, destinationChainId: 4663 } });

    expect(multicallMock).toHaveBeenCalledTimes(1);
    const [{ contracts }] = multicallMock.mock.calls[0] ?? [{ contracts: [] }];
    expect(contracts.map(({ address }) => address)).toEqual(
      expect.arrayContaining([DAI_ETHEREUM, PYUSD_ETHEREUM]),
    );
  });

  it('blocks a listed OFT whose canonical child LayerZero does not know', async () => {
    mockRegistryFetch({
      layerZeroMetadata: {
        ethereum: { tokens: { [DAI_ETHEREUM]: { type: 'OFT' } } },
        arbitrum: {
          tokens: {
            [OTHER_DAI_ARBITRUM]: {
              type: 'OFT',
              peggedTo: { address: DAI_ETHEREUM, chainName: 'ethereum' },
            },
          },
        },
      },
    });

    expect(
      await getCanonicalDestination({ sourceChainId: 1, destinationChainId: 42161 }, DAI_ETHEREUM),
    ).toBeUndefined();
    const [{ contracts }] = multicallMock.mock.calls[0] ?? [{ contracts: [] }];
    expect(contracts.map(({ address }) => address)).not.toContain(DAI_ETHEREUM);
  });

  it('keeps a listed OFT whose canonical child LayerZero knows', async () => {
    mockRegistryFetch({
      layerZeroMetadata: {
        ethereum: { tokens: { [DAI_ETHEREUM]: { type: 'OFT' } } },
        arbitrum: {
          tokens: {
            [OTHER_DAI_ARBITRUM]: {
              type: 'OFT',
              peggedTo: { address: DAI_ETHEREUM, chainName: 'ethereum' },
            },
            [DAI_ARBITRUM]: { type: 'ERC20' },
          },
        },
      },
    });

    expect(
      await getCanonicalDestination({ sourceChainId: 1, destinationChainId: 42161 }, DAI_ETHEREUM),
    ).toBe(DAI_ARBITRUM);
  });

  it('keeps the canonical PYUSD route that the registry exempts', async () => {
    mockRegistryFetch({
      layerZeroMetadata: {
        ethereum: { tokens: { [PYUSD_ETHEREUM]: { type: 'OFT' } } },
        arbitrum: {
          tokens: {
            [PYUSD_LIFI_ARBITRUM]: {
              type: 'OFT',
              peggedTo: { address: PYUSD_ETHEREUM, chainName: 'ethereum' },
            },
          },
        },
      },
    });

    expect(
      await getCanonicalDestination(
        { sourceChainId: 1, destinationChainId: 42161 },
        PYUSD_ETHEREUM,
      ),
    ).toBe(PYUSD_CANONICAL_ARBITRUM);
  });

  it('fails a cold build when the LayerZero metadata is unavailable', async () => {
    mockRegistryFetch({ layerZeroMetadata: null });

    await expect(
      getSelectedTokenAvailability({ pair: { sourceChainId: 1, destinationChainId: 42161 } }),
    ).rejects.toThrow();
  });

  it('blocks an imported deposit of an OFT', async () => {
    mockRegistryFetch();
    onchainOftTokens.add(UNBRIDGED_ETHEREUM);
    const sourceToken = token(1, UNBRIDGED_ETHEREUM, 'NEW');
    const destinationToken = token(42161, UNBRIDGED_ARBITRUM, 'NEW');
    resolveImportMock.mockResolvedValue({
      sourceToken,
      destinationToken,
      availableRoutes: [{ provider: 'canonical', sourceToken, destinationToken }],
    });

    const selection = await getSelectedTokenAvailability({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: UNBRIDGED_ETHEREUM,
    });

    expect(resolveImportMock).toHaveBeenCalled();
    expect(selection?.availableRoutes.map((route) => route.provider)).toEqual(['lifi']);
  });
});

describe('picker pins', () => {
  it('lists the native token and USDC first in the source picker', async () => {
    mockRegistryFetch();

    const sourceTokens = await getSourceTokens({ sourceChainId: 1, destinationChainId: 42161 });

    expect(sourceTokens?.pinnedTokens.map((pinned) => pinned.address)).toEqual([
      NATIVE_TOKEN_ADDRESS,
      USDC_ETHEREUM,
    ]);
    expect(sourceTokens?.tokens.map((listed) => listed.address)).not.toContain(USDC_ETHEREUM);
    const symbols = sourceTokens?.tokens.map((listed) => listed.symbol) ?? [];
    expect(symbols).toEqual([...symbols].sort((a, b) => a.localeCompare(b)));
  });

  it('pins the destination chain tokens in the destination picker', async () => {
    mockRegistryFetch();

    const destinationTokens = await getDestinationTokensForSource({
      pair: { sourceChainId: 1, destinationChainId: 42161 },
      sourceTokenAddress: USDC_ETHEREUM,
    });

    expect(destinationTokens?.pinnedTokens.map((pinned) => pinned.address)).toEqual([
      NATIVE_TOKEN_ADDRESS,
      USDC_ARBITRUM,
    ]);
  });
});

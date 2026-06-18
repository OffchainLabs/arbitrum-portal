import { describe, expect, it } from 'vitest';

import {
  filterTokens,
  getDefaultDestinationToken,
  getDestinationTokens,
  getRoutes,
  getRoutesForPair,
  getSourceTokens,
  getSwapDestinationTokens,
  hasSwapRoute,
} from '../selectors';
import { NATIVE_TOKEN_ADDRESS, toTokenId } from '../types';
import {
  ARB_ARBITRUM,
  DAI_ARBITRUM,
  DAI_ETHEREUM,
  OFT_ADAPTER,
  PEPE_ETHEREUM,
  USDCE_ARBITRUM,
  USDC_ARBITRUM,
  USDC_ETHEREUM,
  USDT0_ARBITRUM,
  USDT_ETHEREUM,
  buildFixtureView,
  swapDestinations,
} from './fixtures';

const usdcId = toTokenId(1, USDC_ETHEREUM);
const usdtId = toTokenId(1, USDT_ETHEREUM);
const daiId = toTokenId(1, DAI_ETHEREUM);
const pepeId = toTokenId(1, PEPE_ETHEREUM);
const nativeId = toTokenId(1, NATIVE_TOKEN_ADDRESS);

const view = buildFixtureView();

describe('getSourceTokens', () => {
  it('returns the union of provider section keys, joined against the registry', () => {
    const result = getSourceTokens(view);

    // ETH, USDC, USDT, DAI, PEPE — the orphan address has no token record
    expect(result.map((token) => token.id)).toEqual(
      expect.arrayContaining([usdcId, usdtId, daiId, pepeId, nativeId]),
    );
    expect(result).toHaveLength(5);
  });

  it('sorts by symbol', () => {
    const symbols = getSourceTokens(view).map((token) => token.symbol);
    expect(symbols).toEqual([...symbols].sort((a, b) => a.localeCompare(b)));
  });

  it('filters by search term, case-insensitively', () => {
    const symbols = getSourceTokens(view, 'usd').map((token) => token.symbol);
    expect(symbols).toEqual(['USDC', 'USDT']);
    expect(getSourceTokens(view, 'USDC Tok').map((token) => token.id)).toEqual([usdcId]);
  });

  it('finds a token by address', () => {
    expect(getSourceTokens(view, PEPE_ETHEREUM).map((token) => token.id)).toEqual([pepeId]);
    expect(getSourceTokens(view, PEPE_ETHEREUM.toUpperCase()).map((token) => token.id)).toEqual([
      pepeId,
    ]);
  });
});

describe('getRoutes', () => {
  it('materializes one route per matching provider section', () => {
    const routes = getRoutes(view, usdcId);

    expect(routes).toEqual([
      {
        provider: 'canonical',
        sourceTokenId: usdcId,
        destinationTokenId: toTokenId(42161, USDCE_ARBITRUM),
      },
      {
        provider: 'cctp',
        sourceTokenId: usdcId,
        destinationTokenId: toTokenId(42161, USDC_ARBITRUM),
      },
      {
        provider: 'lifi',
        sourceTokenId: usdcId,
        destinationTokenId: toTokenId(42161, USDC_ARBITRUM),
      },
    ]);
  });

  it('carries layerzero-specific fields on the route', () => {
    expect(getRoutes(view, usdtId)).toEqual([
      {
        provider: 'layerzero',
        sourceTokenId: usdtId,
        destinationTokenId: toTokenId(42161, USDT0_ARBITRUM),
        oftAdapter: OFT_ADAPTER,
        destinationEndpointId: 30110,
      },
    ]);
  });

  it('materializes a swap-only lifi route without a destination', () => {
    expect(getRoutes(view, pepeId)).toEqual([
      { provider: 'lifi', sourceTokenId: pepeId, destinationTokenId: undefined },
    ]);
  });

  it('returns no routes for an unknown token', () => {
    expect(getRoutes(view, toTokenId(1, '0xdead'))).toEqual([]);
  });
});

describe('hasSwapRoute', () => {
  it('is true only for tokens with a lifi route', () => {
    expect(hasSwapRoute(view, pepeId)).toBe(true);
    expect(hasSwapRoute(view, usdcId)).toBe(true);
    expect(hasSwapRoute(view, daiId)).toBe(false);
  });
});

describe('getSwapDestinationTokens', () => {
  it('resolves the pair swap set for tokens with a lifi route', () => {
    const result = getSwapDestinationTokens({ view, sourceTokenId: pepeId, swapDestinations });
    expect(result.map((token) => token.id)).toEqual([
      toTokenId(42161, USDC_ARBITRUM),
      toTokenId(42161, NATIVE_TOKEN_ADDRESS),
      toTokenId(42161, ARB_ARBITRUM),
    ]);
  });

  it('returns nothing for tokens without a lifi route', () => {
    expect(getSwapDestinationTokens({ view, sourceTokenId: daiId, swapDestinations })).toEqual([]);
  });
});

describe('getDestinationTokens', () => {
  it('unions fixed bridge outputs with the swap set, deduplicated', () => {
    const result = getDestinationTokens({ view, sourceTokenId: usdcId, swapDestinations });

    // fixed: USDC.e (canonical), USDC (cctp + lifi counterpart)
    // swap set: USDC, ETH, ARB — USDC deduplicates
    expect(result.map((token) => token.id).sort()).toEqual(
      [
        toTokenId(42161, USDCE_ARBITRUM),
        toTokenId(42161, USDC_ARBITRUM),
        toTokenId(42161, NATIVE_TOKEN_ADDRESS),
        toTokenId(42161, ARB_ARBITRUM),
      ].sort(),
    );
  });
});

describe('filterTokens', () => {
  it('searches destination-chain tokens through the same index', () => {
    const destinations = getDestinationTokens({ view, sourceTokenId: usdcId, swapDestinations });

    expect(filterTokens(view, destinations, 'arb').map((token) => token.symbol)).toEqual(['ARB']);
    expect(filterTokens(view, destinations, ARB_ARBITRUM).map((token) => token.symbol)).toEqual([
      'ARB',
    ]);
    expect(filterTokens(view, destinations)).toEqual(destinations);
  });
});

describe('getDefaultDestinationToken', () => {
  it('prefers layerzero over other providers', () => {
    expect(getDefaultDestinationToken(view, usdtId)?.id).toBe(toTokenId(42161, USDT0_ARBITRUM));
  });

  it('prefers cctp over canonical and lifi', () => {
    expect(getDefaultDestinationToken(view, usdcId)?.id).toBe(toTokenId(42161, USDC_ARBITRUM));
  });

  it('falls back to canonical', () => {
    expect(getDefaultDestinationToken(view, daiId)?.id).toBe(toTokenId(42161, DAI_ARBITRUM));
  });

  it('returns null when the only route is swap-only', () => {
    expect(getDefaultDestinationToken(view, pepeId)).toBeNull();
  });
});

describe('getRoutesForPair', () => {
  it('returns fixed routes matching the destination plus lifi when in the swap set', () => {
    const providers = getRoutesForPair({
      view,
      sourceTokenId: usdcId,
      destinationTokenId: toTokenId(42161, USDC_ARBITRUM),
      swapDestinations,
    }).map((route) => route.provider);
    expect(providers).toEqual(['cctp', 'lifi']);
  });

  it('excludes lifi when the destination is outside the swap set', () => {
    const providers = getRoutesForPair({
      view,
      sourceTokenId: usdcId,
      destinationTokenId: toTokenId(42161, USDCE_ARBITRUM),
      swapDestinations,
    }).map((route) => route.provider);
    expect(providers).toEqual(['canonical']);
  });

  it('returns lifi alone for a pure swap destination', () => {
    const providers = getRoutesForPair({
      view,
      sourceTokenId: usdcId,
      destinationTokenId: toTokenId(42161, ARB_ARBITRUM),
      swapDestinations,
    }).map((route) => route.provider);
    expect(providers).toEqual(['lifi']);
  });

  it('returns nothing when the source token cannot reach the destination', () => {
    expect(
      getRoutesForPair({
        view,
        sourceTokenId: daiId,
        destinationTokenId: toTokenId(42161, ARB_ARBITRUM),
        swapDestinations,
      }),
    ).toEqual([]);
  });
});

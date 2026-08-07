import type { TokenList } from '@uniswap/token-lists';
import { describe, expect, it } from 'vitest';

import { LIFI_TRANSFER_LIST_ID, type TokenListWithId } from '../../util/TokenListUtils';
import { mergeLifiTokenList, tokenListsToSearchableTokenStorage } from './TokenSearchUtils';

describe('tokenListsToSearchableTokenStorage', () => {
  it('keeps existing fields when a later non-LiFi token merges the same L1 token', () => {
    const l1Address = '0x6c3ea9036406852006290770bedfcaba0e23a0e8';
    const lifiL2Address = '0x46850ad61c2b7d64d08c9c754f45254596696984';
    const canonicalL2Address = '0x327006c8712fe0abdbbd55b7999db39b0967342e';

    const lifiList: TokenListWithId = {
      name: 'LiFi Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 42161,
          address: lifiL2Address,
          name: 'PayPal USD OFT',
          symbol: 'pYUSD',
          decimals: 6,
          extensions: {
            bridgeInfo: {
              '1': {
                tokenAddress: l1Address,
              },
            },
          },
        },
      ],
      l2ChainId: '42161',
      bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    };

    const canonicalList: TokenListWithId = {
      name: 'Canonical Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 42161,
          address: canonicalL2Address,
          logoURI: '/images/pyusd.svg',
          name: 'PayPal USD Canonical',
          symbol: 'PYUSD',
          decimals: 6,
          extensions: {
            bridgeInfo: {
              '1': {
                tokenAddress: l1Address,
              },
            },
          },
        },
      ],
      l2ChainId: '42161',
      bridgeTokenListId: '1',
    };

    const tokens = tokenListsToSearchableTokenStorage([lifiList, canonicalList], '1', '42161');

    expect(tokens[l1Address]?.name).toBe('PayPal USD OFT');
    expect(tokens[l1Address]?.symbol).toBe('pYUSD');
    expect(tokens[l1Address]?.logoURI).toBe('/images/pyusd.svg');
    expect(tokens[l1Address]?.l2Address).toBe(lifiL2Address);
    expect(tokens[l1Address]?.listIds).toEqual(new Set([LIFI_TRANSFER_LIST_ID, '1']));
  });

  it('fills a missing field on an existing LiFi token from a later non-LiFi token', () => {
    const l1Address = '0x6c3ea9036406852006290770bedfcaba0e23a0e8';
    const lifiL2Address = '0x46850ad61c2b7d64d08c9c754f45254596696984';
    const canonicalL2Address = '0x327006c8712fe0abdbbd55b7999db39b0967342e';

    const lifiList: TokenListWithId = {
      name: 'LiFi Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 42161,
          address: lifiL2Address,
          name: 'PayPal USD OFT',
          symbol: 'pYUSD',
          decimals: 6,
          extensions: {
            bridgeInfo: {
              '1': {
                tokenAddress: l1Address,
              },
            },
          },
        },
      ],
      l2ChainId: '42161',
      bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    };

    const canonicalList: TokenListWithId = {
      name: 'Canonical Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 42161,
          address: canonicalL2Address,
          logoURI: '/images/pyusd.svg',
          name: 'PayPal USD Canonical',
          symbol: 'PYUSD',
          decimals: 6,
          extensions: {
            bridgeInfo: {
              '1': {
                tokenAddress: l1Address,
              },
            },
          },
        },
      ],
      l2ChainId: '42161',
      bridgeTokenListId: '1',
    };

    const tokens = tokenListsToSearchableTokenStorage([lifiList, canonicalList], '1', '42161');

    expect(tokens[l1Address]?.name).toBe('PayPal USD OFT');
    expect(tokens[l1Address]?.symbol).toBe('pYUSD');
    expect(tokens[l1Address]?.logoURI).toBe('/images/pyusd.svg');
    expect(tokens[l1Address]?.l2Address).toBe(lifiL2Address);
    expect(tokens[l1Address]?.listIds).toEqual(new Set([LIFI_TRANSFER_LIST_ID, '1']));
  });
});

describe('mergeLifiTokenList', () => {
  const childChainId = 42161;

  function buildTokenList({ symbol }: { symbol: string }): TokenList {
    return {
      name: 'LiFi Tokens',
      timestamp: '2026-01-01T00:00:00.000Z',
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: childChainId,
          address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
          name: 'PayPal USD OFT',
          symbol,
          decimals: 6,
        },
      ],
    };
  }

  function buildListWithId({ bridgeTokenListId }: { bridgeTokenListId: string }): TokenListWithId {
    return {
      ...buildTokenList({ symbol: 'stale' }),
      name: `List ${bridgeTokenListId}`,
      l2ChainId: String(childChainId),
      bridgeTokenListId,
    };
  }

  it('returns an empty list when the token lists have not loaded', () => {
    expect(
      mergeLifiTokenList({
        tokenLists: undefined,
        lifiTokenList: buildTokenList({ symbol: 'fresh' }),
        childChainId,
      }),
    ).toEqual([]);
  });

  it('returns the same array reference when there is nothing to overlay', () => {
    const tokenLists = [buildListWithId({ bridgeTokenListId: LIFI_TRANSFER_LIST_ID })];

    // Referential stability matters: the result feeds an SWR key that deep-hashes every token.
    expect(mergeLifiTokenList({ tokenLists, lifiTokenList: undefined, childChainId })).toBe(
      tokenLists,
    );
  });

  it('overlays the refreshed payload onto the LiFi entry, keeping its list identity', () => {
    const tokenLists = [buildListWithId({ bridgeTokenListId: LIFI_TRANSFER_LIST_ID })];

    const merged = mergeLifiTokenList({
      tokenLists,
      lifiTokenList: buildTokenList({ symbol: 'fresh' }),
      childChainId,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]?.tokens[0]?.symbol).toBe('fresh');
    expect(merged[0]?.bridgeTokenListId).toBe(LIFI_TRANSFER_LIST_ID);
    expect(merged[0]?.l2ChainId).toBe(String(childChainId));
  });

  it('leaves non-LiFi lists untouched by reference', () => {
    const canonicalList = buildListWithId({ bridgeTokenListId: '1' });
    const tokenLists = [
      canonicalList,
      buildListWithId({ bridgeTokenListId: LIFI_TRANSFER_LIST_ID }),
    ];

    const merged = mergeLifiTokenList({
      tokenLists,
      lifiTokenList: buildTokenList({ symbol: 'fresh' }),
      childChainId,
    });

    expect(merged[0]).toBe(canonicalList);
    expect(merged[1]?.tokens[0]?.symbol).toBe('fresh');
  });

  it('adds the refreshed list when the load-time fetch of it failed', () => {
    const tokenLists = [buildListWithId({ bridgeTokenListId: '1' })];

    const merged = mergeLifiTokenList({
      tokenLists,
      lifiTokenList: buildTokenList({ symbol: 'fresh' }),
      childChainId,
    });

    expect(merged).toHaveLength(2);
    expect(merged[1]?.bridgeTokenListId).toBe(LIFI_TRANSFER_LIST_ID);
    expect(merged[1]?.l2ChainId).toBe(String(childChainId));
    expect(merged[1]?.tokens[0]?.symbol).toBe('fresh');
  });
});

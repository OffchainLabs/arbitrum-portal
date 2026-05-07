import { describe, expect, it } from 'vitest';

import { LIFI_TRANSFER_LIST_ID, type TokenListWithId } from '../../util/TokenListUtils';
import { tokenListsToSearchableTokenStorage } from './TokenSearchUtils';

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

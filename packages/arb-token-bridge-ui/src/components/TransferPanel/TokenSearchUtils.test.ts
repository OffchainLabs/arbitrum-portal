import { describe, expect, it, vi } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { ChainId } from '../../types/ChainId';
import {
  LIFI_TRANSFER_LIST_ID,
  type TokenListWithId,
  isTokenAvailableOnChain,
} from '../../util/TokenListUtils';
import { addTokenFromSearch, tokenListsToSearchableTokenStorage } from './TokenSearchUtils';

describe('addTokenFromSearch', () => {
  const address = '0x0000000000000000000000000000000000000001';

  it('falls through from canonical import to L2-native import', async () => {
    const token = {
      add: vi.fn().mockRejectedValue(new Error('Not canonical')),
      addLifiTokenForChain: vi.fn(),
      addL2NativeToken: vi.fn(),
    };

    await expect(
      addTokenFromSearch({
        address,
        sourceChainId: ChainId.ArbitrumOne,
        token,
      }),
    ).resolves.toBe('success');

    expect(token.add).toHaveBeenCalledWith(address);
    expect(token.addLifiTokenForChain).not.toHaveBeenCalled();
    expect(token.addL2NativeToken).toHaveBeenCalledWith(address);
  });

  it('falls through from chain-specific import to L2-native import', async () => {
    const token = {
      add: vi.fn().mockRejectedValue(new Error('Not canonical')),
      addLifiTokenForChain: vi.fn().mockRejectedValue(new Error('Not chain-specific')),
      addL2NativeToken: vi.fn(),
    };

    await expect(
      addTokenFromSearch({
        address,
        sourceChainId: ChainId.RobinhoodChain,
        token,
      }),
    ).resolves.toBe('success');

    expect(token.addLifiTokenForChain).toHaveBeenCalledWith(address, ChainId.RobinhoodChain);
    expect(token.addL2NativeToken).toHaveBeenCalledWith(address);
  });
});

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

  it('ingests a child-only LiFi token for its own chain', () => {
    const address = '0x0000000000000000000000000000000000004663';
    const lifiList: TokenListWithId = {
      name: 'LiFi Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 4663,
          address,
          name: 'Robinhood-only token',
          symbol: 'RHOOD',
          decimals: 18,
          extensions: {
            priceUSD: '1.23',
          },
        },
      ],
      l2ChainId: '4663',
      bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    };

    const tokens = tokenListsToSearchableTokenStorage([lifiList], '1', '4663');

    expect(tokens[address]).toMatchObject({
      address,
      l2Address: address,
      symbol: 'RHOOD',
      lifiOnlyChainId: 4663,
      priceUSD: 1.23,
    });
    expect(tokens[address]?.listIds).toEqual(new Set([LIFI_TRANSFER_LIST_ID]));
    expect(isTokenAvailableOnChain(tokens[address], 4663)).toBe(true);
    expect(isTokenAvailableOnChain(tokens[address], 1)).toBe(false);
  });

  it('ingests a parent-only LiFi token for its own chain', () => {
    const address = '0x0000000000000000000000000000000000004663';
    const lifiList: TokenListWithId = {
      name: 'LiFi Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 4663,
          address,
          name: 'Robinhood-only token',
          symbol: 'RHOOD',
          decimals: 18,
        },
      ],
      l2ChainId: '42161',
      bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    };

    const tokens = tokenListsToSearchableTokenStorage([lifiList], '4663', '42161');
    expect(tokens[address]).toMatchObject({
      address,
      l2Address: undefined,
      lifiOnlyChainId: 4663,
    });
    expect(isTokenAvailableOnChain(tokens[address], 4663)).toBe(true);
    expect(isTokenAvailableOnChain(tokens[address], 42161)).toBe(false);
  });

  it.each([
    ['parent first', false],
    ['child first', true],
  ])(
    'does not infer a pair from same-address parent-only and child-only entries (%s)',
    (_, childFirst) => {
      const address = '0x0000000000000000000000000000000000004663';
      const createLifiList = (chainId: number): TokenListWithId => ({
        name: 'LiFi Tokens',
        timestamp: new Date().toISOString(),
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId,
            address,
            name: 'Same-address token',
            symbol: 'SAME',
            decimals: 18,
          },
        ],
        l2ChainId: '42161',
        bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
      });
      const parentList = createLifiList(1);
      const childList = createLifiList(42161);
      const tokenLists = childFirst ? [childList, parentList] : [parentList, childList];

      const token = tokenListsToSearchableTokenStorage(tokenLists, '1', '42161')[address];

      expect(token).toMatchObject({
        address,
        l2Address: address,
        lifiOnlyChainId: 42161,
      });
    },
  );

  it.each([
    ['canonical first', false],
    ['LiFi first', true],
  ])(
    'keeps a same-address canonical pair when merging an unpaired LiFi token (%s)',
    (_, lifiFirst) => {
      const address = '0x0000000000000000000000000000000000000001';
      const canonicalList: TokenListWithId = {
        name: 'Canonical Tokens',
        timestamp: new Date().toISOString(),
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address,
            name: 'Canonical token',
            symbol: 'CAN',
            decimals: 18,
            extensions: {
              bridgeInfo: {
                '1': {
                  tokenAddress: address,
                },
              },
            },
          },
        ],
        l2ChainId: '42161',
        bridgeTokenListId: '1',
      };
      const lifiList: TokenListWithId = {
        name: 'LiFi Tokens',
        timestamp: new Date().toISOString(),
        version: { major: 1, minor: 0, patch: 0 },
        tokens: [
          {
            chainId: 42161,
            address,
            name: 'LiFi token',
            symbol: 'LIFI',
            decimals: 18,
          },
        ],
        l2ChainId: '42161',
        bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
      };

      const tokenLists = lifiFirst ? [lifiList, canonicalList] : [canonicalList, lifiList];
      const tokens = tokenListsToSearchableTokenStorage(tokenLists, '1', '42161');

      expect(tokens[address]).toMatchObject({
        address,
        l2Address: address,
      });
      expect(tokens[address]?.lifiOnlyChainId).toBeUndefined();
      expect(tokens[address]?.listIds).toEqual(new Set(['1', LIFI_TRANSFER_LIST_ID]));
    },
  );

  it.each([
    ['parent first', false],
    ['child first', true],
  ])('keeps an unpaired same-address token child-only (%s)', (_, childFirst) => {
    const address = '0x0000000000000000000000000000000000000002';
    const parentList: TokenListWithId = {
      name: 'Parent Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 1,
          address,
          name: 'Parent token',
          symbol: 'SAME',
          decimals: 18,
        },
      ],
      l2ChainId: '42161',
      bridgeTokenListId: '1',
    };
    const childList: TokenListWithId = {
      name: 'LiFi Tokens',
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
      tokens: [
        {
          chainId: 42161,
          address,
          name: 'Child token',
          symbol: 'SAME',
          decimals: 18,
        },
      ],
      l2ChainId: '42161',
      bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    };

    const tokenLists = childFirst ? [childList, parentList] : [parentList, childList];
    const token = tokenListsToSearchableTokenStorage(tokenLists, '1', '42161')[address];

    expect(token).toMatchObject({
      address,
      l2Address: address,
      lifiOnlyChainId: 42161,
    });
  });

  it('keeps a bridged token with the same address on both chains available on both chains', () => {
    const address = '0x0000000000000000000000000000000000000001';
    const token: ERC20BridgeToken = {
      type: TokenType.ERC20,
      name: 'Bridged token',
      symbol: 'BRG',
      address,
      l2Address: address,
      decimals: 18,
      listIds: new Set(),
    };

    expect(isTokenAvailableOnChain(token, 1)).toBe(true);
    expect(isTokenAvailableOnChain(token, 42161)).toBe(true);
  });
});

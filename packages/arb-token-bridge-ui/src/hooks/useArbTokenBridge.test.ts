import { describe, expect, it } from 'vitest';

import { LIFI_TRANSFER_LIST_ID } from '../util/TokenListUtils';
import { type ERC20BridgeToken, TokenType } from './arbTokenBridge.types';
import { mergeBridgeToken } from './useArbTokenBridge';

const buildToken = (overrides: Partial<ERC20BridgeToken> = {}): ERC20BridgeToken => ({
  name: 'PayPal USD',
  symbol: 'PYUSD',
  type: TokenType.ERC20,
  address: '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
  decimals: 6,
  l2Address: '0x327006c8712fe0abdbbd55b7999db39b0967342e',
  listIds: new Set<string>(),
  ...overrides,
});

describe('mergeBridgeToken', () => {
  it('keeps existing fields when a later non-LiFi token merges the same token', () => {
    const lifiToken = buildToken({
      name: 'PayPal USD OFT',
      symbol: 'pYUSD',
      l2Address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
      listIds: new Set([LIFI_TRANSFER_LIST_ID]),
    });
    const tokenToAdd = buildToken({
      logoURI: '/images/pyusd.svg',
      name: 'PayPal USD Canonical',
      symbol: 'PYUSD',
      l2Address: undefined,
    });

    const mergedToken = mergeBridgeToken({
      existingToken: lifiToken,
      tokenToAdd,
      listId: '1',
    });

    expect(mergedToken.name).toBe('PayPal USD OFT');
    expect(mergedToken.symbol).toBe('pYUSD');
    expect(mergedToken.logoURI).toBe('/images/pyusd.svg');
    expect(mergedToken.l2Address).toBe('0x46850ad61c2b7d64d08c9c754f45254596696984');
    expect(mergedToken.listIds).toEqual(new Set([LIFI_TRANSFER_LIST_ID, '1']));
  });

  it('fills a missing field on an existing LiFi token from a later non-LiFi token', () => {
    const lifiToken = buildToken({
      name: 'PayPal USD OFT',
      symbol: 'pYUSD',
      logoURI: undefined,
      l2Address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
      listIds: new Set([LIFI_TRANSFER_LIST_ID]),
    });
    const tokenToAdd = buildToken({
      logoURI: '/images/pyusd.svg',
      name: 'PayPal USD Canonical',
      symbol: 'PYUSD',
    });

    const mergedToken = mergeBridgeToken({
      existingToken: lifiToken,
      tokenToAdd,
      listId: '1',
    });

    expect(mergedToken.name).toBe('PayPal USD OFT');
    expect(mergedToken.symbol).toBe('pYUSD');
    expect(mergedToken.logoURI).toBe('/images/pyusd.svg');
    expect(mergedToken.l2Address).toBe('0x46850ad61c2b7d64d08c9c754f45254596696984');
    expect(mergedToken.listIds).toEqual(new Set([LIFI_TRANSFER_LIST_ID, '1']));
  });

  it('allows the LiFi list to overwrite a previously merged property', () => {
    const existingToken = buildToken({
      l2Address: '0x327006c8712fe0abdbbd55b7999db39b0967342e',
      listIds: new Set(['1']),
    });
    const tokenToAdd = buildToken({
      l2Address: '0x46850ad61c2b7d64d08c9c754f45254596696984',
    });

    const mergedToken = mergeBridgeToken({
      existingToken,
      tokenToAdd,
      listId: LIFI_TRANSFER_LIST_ID,
    });

    expect(mergedToken.l2Address).toBe('0x46850ad61c2b7d64d08c9c754f45254596696984');
    expect(mergedToken.listIds).toEqual(new Set(['1', LIFI_TRANSFER_LIST_ID]));
  });
});

import { describe, expect, it } from 'vitest';

import { ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';
import { LIFI_TRANSFER_LIST_ID } from './TokenListUtils';
import { mergeBridgeTokens } from './mergeBridgeTokens';

const address = '0x0000000000000000000000000000000000000001';

function buildToken(overrides: Partial<ERC20BridgeToken> = {}): ERC20BridgeToken {
  return {
    name: 'Token',
    symbol: 'TKN',
    type: TokenType.ERC20,
    address,
    decimals: 18,
    listIds: new Set(),
    ...overrides,
  };
}

describe('mergeBridgeTokens', () => {
  it('returns an incoming token when no existing token is present', () => {
    const incomingToken = buildToken({ listIds: new Set([LIFI_TRANSFER_LIST_ID]) });

    const token = mergeBridgeTokens({
      existingToken: undefined,
      incomingToken,
      incomingListId: LIFI_TRANSFER_LIST_ID,
    });

    expect(token).toMatchObject(incomingToken);
    expect(token.listIds).toEqual(incomingToken.listIds);
  });

  it('uses LiFi metadata and combines list IDs', () => {
    const existingToken = buildToken({
      name: 'Existing token',
      listIds: new Set(['canonical-list']),
    });
    const incomingToken = buildToken({
      name: 'LiFi token',
      listIds: new Set([LIFI_TRANSFER_LIST_ID]),
    });

    const token = mergeBridgeTokens({
      existingToken,
      incomingToken,
      incomingListId: LIFI_TRANSFER_LIST_ID,
    });

    expect(token.name).toBe('LiFi token');
    expect(token.listIds).toEqual(new Set(['canonical-list', LIFI_TRANSFER_LIST_ID]));
  });

  it.each([
    ['canonical first', false],
    ['LiFi-only first', true],
  ])('keeps verified paired-token metadata regardless of merge order (%s)', (_, lifiFirst) => {
    const canonicalToken = buildToken({
      l2Address: '0x0000000000000000000000000000000000000002',
      listIds: new Set(['canonical-list']),
    });
    const lifiOnlyToken = buildToken({
      l2Address: address,
      lifiOnlyChainId: 42161,
      listIds: new Set([LIFI_TRANSFER_LIST_ID]),
    });

    const token = lifiFirst
      ? mergeBridgeTokens({
          existingToken: lifiOnlyToken,
          incomingToken: canonicalToken,
          incomingListId: 'canonical-list',
        })
      : mergeBridgeTokens({
          existingToken: canonicalToken,
          incomingToken: lifiOnlyToken,
          incomingListId: LIFI_TRANSFER_LIST_ID,
        });

    expect(token.l2Address).toBe(canonicalToken.l2Address);
    expect(token.lifiOnlyChainId).toBeUndefined();
  });

  it('preserves optional existing metadata when a non-LiFi token is merged', () => {
    const token = mergeBridgeTokens({
      existingToken: buildToken({
        logoURI: '/token.svg',
        isL2Native: true,
        priceUSD: 1,
      }),
      incomingToken: buildToken(),
      incomingListId: 'canonical-list',
    });

    expect(token).toMatchObject({
      logoURI: '/token.svg',
      isL2Native: true,
      priceUSD: 1,
    });
  });

  it('merges an imported LiFi-only token without adding a token-list ID', () => {
    const canonicalToken = buildToken({
      l2Address: '0x0000000000000000000000000000000000000002',
      listIds: new Set(['canonical-list']),
    });

    const token = mergeBridgeTokens({
      existingToken: canonicalToken,
      incomingToken: buildToken({
        l2Address: address,
        lifiOnlyChainId: 42161,
      }),
    });

    expect(token.l2Address).toBe(canonicalToken.l2Address);
    expect(token.lifiOnlyChainId).toBeUndefined();
    expect(token.listIds).toEqual(new Set(['canonical-list']));
  });
});

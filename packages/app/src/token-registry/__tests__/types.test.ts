import { describe, expect, it } from 'vitest';

import {
  NATIVE_TOKEN_ADDRESS,
  addressFromTokenId,
  isNativeToken,
  pairKey,
  toTokenId,
} from '../types';
import { getFixtureToken } from './fixtures';

describe('toTokenId', () => {
  it('lowercases the address', () => {
    expect(toTokenId(1, '0xABCDEF')).toBe('1:0xabcdef');
  });
});

describe('addressFromTokenId', () => {
  it('round-trips with toTokenId', () => {
    const id = toTokenId(42161, '0xaf88d065e77c8cc2239327c5edb3a432268e5831');
    expect(addressFromTokenId(id)).toBe('0xaf88d065e77c8cc2239327c5edb3a432268e5831');
  });
});

describe('isNativeToken', () => {
  it('identifies the zero address as native', () => {
    const native = getFixtureToken(toTokenId(1, NATIVE_TOKEN_ADDRESS));
    const erc20 = getFixtureToken(toTokenId(1, '0x' + '01'.repeat(20)));

    expect(isNativeToken(native)).toBe(true);
    expect(isNativeToken(erc20)).toBe(false);
  });
});

describe('pairKey', () => {
  it('encodes the ordered pair', () => {
    expect(pairKey({ sourceChainId: 1, destinationChainId: 42161 })).toBe('1->42161');
    expect(pairKey({ sourceChainId: 42161, destinationChainId: 1 })).toBe('42161->1');
  });
});

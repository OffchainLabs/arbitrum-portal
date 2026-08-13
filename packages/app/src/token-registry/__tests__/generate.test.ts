import { describe, expect, it, vi } from 'vitest';

import { getCuratedCoinKey, isExcludedToken } from '../constants';
import { CanonicalEntry, generateCanonical } from '../server/generate';
import { NATIVE_TOKEN_ADDRESS, Token, toTokenId } from '../types';
import { DAI_ARBITRUM, DAI_ETHEREUM } from './fixtures';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: never[]) => unknown) => fn,
}));

// real addresses — PYUSD deposits are excluded via canonicalRouteExclusions
const PYUSD_ETHEREUM = '0x6c3ea9036406852006290770bedfcaba0e23a0e8' as Token['address'];
const PYUSD_CANONICAL_ARBITRUM = '0x327006c8712fe0abdbbd55b7999db39b0967342e' as Token['address'];

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
    expect(getCuratedCoinKey(42161, '0x46850ad61c2b7d64d08c9c754f45254596696984')).toBe('PYUSD');
    expect(getCuratedCoinKey(1, '0x57e114B691Db790C35207b2e685D4A43181e6061')).toBe('ENA');
    expect(getCuratedCoinKey(42161, '0x58538e6a46e07434d7e7375bc268d3cb839c0133')).toBe('ENA');
  });

  it('returns undefined for uncurated tokens', () => {
    expect(getCuratedCoinKey(1, DAI_ETHEREUM)).toBeUndefined();
    // the canonical-bridged PYUSD is intentionally NOT curated — its route is canonical
    expect(getCuratedCoinKey(42161, PYUSD_CANONICAL_ARBITRUM)).toBeUndefined();
  });
});

describe('generateCanonical', () => {
  it('always routes native to native', () => {
    const deposit = generateCanonical(entries, { sourceChainId: 1, destinationChainId: 42161 });
    expect(deposit.routes[NATIVE_TOKEN_ADDRESS]).toBe(NATIVE_TOKEN_ADDRESS);
  });

  it('excludes PYUSD from deposit routes but keeps other tokens', () => {
    const deposit = generateCanonical(entries, { sourceChainId: 1, destinationChainId: 42161 });

    expect(deposit.routes[PYUSD_ETHEREUM]).toBeUndefined();
    expect(deposit.routes[DAI_ETHEREUM]).toBe(DAI_ARBITRUM);
  });

  it('keeps the PYUSD canonical withdrawal route', () => {
    const withdrawal = generateCanonical(entries, { sourceChainId: 42161, destinationChainId: 1 });

    expect(withdrawal.routes[PYUSD_CANONICAL_ARBITRUM]).toBe(PYUSD_ETHEREUM);
    expect(withdrawal.routes[DAI_ARBITRUM]).toBe(DAI_ETHEREUM);
  });
});

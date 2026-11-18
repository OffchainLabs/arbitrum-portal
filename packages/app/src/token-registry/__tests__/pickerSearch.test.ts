import { describe, expect, it } from 'vitest';

import {
  RegistryIndexFile,
  TopToken,
  addRecentToken,
  getNetworkSuggestions,
  mergePickerTokens,
  removeNetworkQuery,
  searchTokens,
  tokenKey,
} from '../registryFiles';

const chains: RegistryIndexFile['chains'] = [
  { chainId: 1, name: 'Ethereum' },
  { chainId: 8453, name: 'Base' },
  { chainId: 42161, name: 'Arbitrum One' },
  { chainId: 42170, name: 'Arbitrum Nova' },
];
const token = (chainId: number, symbol: string, address: string): TopToken => ({
  chainId,
  address,
  symbol,
  name: symbol === 'USDC' ? 'USD Coin' : 'Ether',
  decimals: 18,
});
const ethereumUsdc = token(1, 'USDC', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
const baseUsdc = token(8453, 'USDC', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
const baseEth = token(8453, 'ETH', '0x0000000000000000000000000000000000000000');
const arbitrumUsdc = token(42161, 'USDC', '0xaf88d065e77c8cc2239327c5edb3a432268e5831');
const tokens = [ethereumUsdc, baseUsdc, baseEth, arbitrumUsdc];

describe('token and network search', () => {
  it('returns Base tokens for a network-only query and suggests Base', () => {
    expect(searchTokens(tokens, 'base', chains)).toEqual([baseUsdc, baseEth]);
    expect(getNetworkSuggestions('base', chains).map((chain) => chain.chainId)).toEqual([8453]);
  });
  it.each(['usdc base', 'BASE USDC', '  usdc   base  ', 'usd coin base'])(
    'combines token and network words: %s',
    (query) => {
      expect(searchTokens(tokens, query, chains)).toEqual([baseUsdc]);
    },
  );
  it('preserves exact address matching across networks', () => {
    expect(
      searchTokens(tokens, baseUsdc.address.toUpperCase().replace('0X', '0x'), chains),
    ).toEqual([baseUsdc]);
    expect(getNetworkSuggestions(baseUsdc.address, chains)).toEqual([]);
  });
  it('does not choose one network when the name is ambiguous', () => {
    expect(getNetworkSuggestions('arbitrum', chains).map((chain) => chain.chainId)).toEqual([
      42161, 42170,
    ]);
    expect(removeNetworkQuery('usdc arbitrum one', 'Arbitrum One')).toBe('usdc');
    expect(removeNetworkQuery('base', 'Base')).toBe('');
  });
  it('keeps ordinary symbol matching and excludes unrelated tokens', () => {
    expect(searchTokens(tokens, 'usdc', chains)).toEqual([ethereumUsdc, baseUsdc, arbitrumUsdc]);
    expect(searchTokens(tokens, 'usdc nonexistent', chains)).toEqual([]);
  });
  it('does not consume single-letter token queries as network names', () => {
    expect(searchTokens(tokens, 'a', chains)).toEqual([]);
    expect(getNetworkSuggestions('a', chains)).toEqual([]);
    expect(removeNetworkQuery('a base', 'Base')).toBe('a');
  });
});

describe('picker identity and recents', () => {
  it('merges held matches without duplicating public matches or collapsing networks', () => {
    expect(mergePickerTokens([baseUsdc], tokens)).toEqual([
      baseUsdc,
      ethereumUsdc,
      baseEth,
      arbitrumUsdc,
    ]);
    expect(tokenKey({ ...baseUsdc, address: baseUsdc.address.toUpperCase() })).toBe(
      tokenKey(baseUsdc),
    );
  });
  it('moves a recent selection to the front and retains at most four', () => {
    expect(addRecentToken(tokens, baseEth)).toEqual([
      baseEth,
      ethereumUsdc,
      baseUsdc,
      arbitrumUsdc,
    ]);
    const next = token(42170, 'ETH', baseEth.address);
    expect(addRecentToken(tokens, next)).toEqual([next, ethereumUsdc, baseUsdc, baseEth]);
  });
});

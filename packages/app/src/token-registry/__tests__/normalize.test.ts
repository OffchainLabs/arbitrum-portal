import { describe, expect, it } from 'vitest';

import { normalizeToken } from '../normalize';

describe('normalizeToken', () => {
  it('lowercases the address and derives the token id', () => {
    const token = normalizeToken({
      chainId: 1,
      address: '0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    });

    expect(token.address).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(token.id).toBe('1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(token.symbol).toBe('USDC');
  });

  it('applies curated metadata while generating the token', () => {
    // USDT0 on Arbitrum One has a curated symbol/name override
    const token = normalizeToken({
      chainId: 42161,
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    });

    expect(token.symbol).toBe('USDT0');
    expect(token.name).toBe('USDT0');
    expect(token.decimals).toBe(6);
  });

  it('keeps the upstream metadata when no curated entry exists', () => {
    const token = normalizeToken({
      chainId: 1,
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: 'https://example.com/dai.png',
    });

    expect(token.symbol).toBe('DAI');
    expect(token.name).toBe('Dai Stablecoin');
    expect(token.logoURI).toBe('https://example.com/dai.png');
  });
});

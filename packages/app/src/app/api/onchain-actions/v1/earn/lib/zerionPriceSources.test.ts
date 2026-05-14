import { describe, expect, it } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { getZerionLookupCacheKey, getZerionPriceLookup } from './zerionPriceSources';

describe('getZerionPriceLookup', () => {
  it('returns null when neither tokenAddress nor assetSymbol is provided', () => {
    expect(getZerionPriceLookup({ chainId: ChainId.ArbitrumOne })).toBeNull();
    expect(
      getZerionPriceLookup({
        chainId: ChainId.ArbitrumOne,
        tokenAddress: null,
        assetSymbol: null,
      }),
    ).toBeNull();
  });

  it('returns null for unknown address and unknown symbol', () => {
    expect(
      getZerionPriceLookup({
        chainId: ChainId.ArbitrumOne,
        tokenAddress: '0x0000000000000000000000000000000000000001',
        assetSymbol: 'UNKNOWNCOIN',
      }),
    ).toBeNull();
  });

  it('matches by address on Arbitrum One (ARB)', () => {
    const result = getZerionPriceLookup({
      chainId: ChainId.ArbitrumOne,
      tokenAddress: CommonAddress.ArbitrumOne.ARB,
    });

    expect(result).toEqual({
      kind: 'implementation',
      implementation: `arbitrum:${CommonAddress.ArbitrumOne.ARB.toLowerCase()}`,
    });
  });

  it('matches by address case-insensitively', () => {
    const lower = getZerionPriceLookup({
      chainId: ChainId.ArbitrumOne,
      tokenAddress: CommonAddress.ArbitrumOne.WETH.toLowerCase(),
    });
    const upper = getZerionPriceLookup({
      chainId: ChainId.ArbitrumOne,
      tokenAddress: CommonAddress.ArbitrumOne.WETH.toUpperCase(),
    });

    expect(lower).not.toBeNull();
    expect(lower).toEqual(upper);
  });

  it('maps Arbitrum sUSDC address to Ethereum USDC implementation', () => {
    const result = getZerionPriceLookup({
      chainId: ChainId.ArbitrumOne,
      tokenAddress: CommonAddress.ArbitrumOne.sUSDC,
    });

    expect(result).toEqual({
      kind: 'implementation',
      implementation: `ethereum:${CommonAddress.Ethereum.USDC.toLowerCase()}`,
    });
  });

  it('falls back to symbol when address has no mapping', () => {
    const result = getZerionPriceLookup({
      chainId: ChainId.ArbitrumOne,
      tokenAddress: '0x0000000000000000000000000000000000000001',
      assetSymbol: 'USDC',
    });

    expect(result).toEqual({
      kind: 'implementation',
      implementation: `ethereum:${CommonAddress.Ethereum.USDC.toLowerCase()}`,
    });
  });

  it('matches symbol case-insensitively and trims whitespace', () => {
    expect(getZerionPriceLookup({ chainId: ChainId.ArbitrumOne, assetSymbol: '  weth  ' })).toEqual(
      {
        kind: 'implementation',
        implementation: `ethereum:${CommonAddress.Ethereum.WETH.toLowerCase()}`,
      },
    );
  });

  it('returns a fungibleId lookup for symbols that are multi-chain abstractions', () => {
    const result = getZerionPriceLookup({
      chainId: ChainId.ArbitrumOne,
      assetSymbol: 'ezETH',
    });

    expect(result).toEqual({
      kind: 'fungibleId',
      fungibleId: '7bc13d30-1a38-4bc5-8a8e-ded71f4ec9b8',
    });
  });

  it('keeps stETH and wstETH as distinct lookups', () => {
    const stEth = getZerionPriceLookup({ chainId: ChainId.ArbitrumOne, assetSymbol: 'stETH' });
    const wstEth = getZerionPriceLookup({ chainId: ChainId.ArbitrumOne, assetSymbol: 'wstETH' });

    expect(stEth).not.toEqual(wstEth);
    expect(stEth).toEqual({
      kind: 'implementation',
      implementation: `ethereum:${CommonAddress.Ethereum.STETH.toLowerCase()}`,
    });
    expect(wstEth).toEqual({
      kind: 'implementation',
      implementation: `ethereum:${CommonAddress.Ethereum.WSTETH.toLowerCase()}`,
    });
  });

  it('prefers address match over symbol fallback', () => {
    // sUSDC address maps to Ethereum USDC, but the symbol 'WETH' would map to Ethereum WETH.
    // Address must win.
    const result = getZerionPriceLookup({
      chainId: ChainId.ArbitrumOne,
      tokenAddress: CommonAddress.ArbitrumOne.sUSDC,
      assetSymbol: 'WETH',
    });

    expect(result).toEqual({
      kind: 'implementation',
      implementation: `ethereum:${CommonAddress.Ethereum.USDC.toLowerCase()}`,
    });
  });
});

describe('getZerionLookupCacheKey', () => {
  it('prefixes implementation lookups with "impl:"', () => {
    expect(
      getZerionLookupCacheKey({
        kind: 'implementation',
        implementation: 'ethereum:0xabc',
      }),
    ).toBe('impl:ethereum:0xabc');
  });

  it('prefixes fungibleId lookups with "id:"', () => {
    expect(getZerionLookupCacheKey({ kind: 'fungibleId', fungibleId: 'some-uuid' })).toBe(
      'id:some-uuid',
    );
  });
});

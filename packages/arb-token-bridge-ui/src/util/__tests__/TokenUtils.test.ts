import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../CommonAddressUtils';
import { sanitizeTokenName, sanitizeTokenSymbol } from '../TokenUtils';

describe('sanitizeTokenSymbol', () => {
  it('keeps Superposition USDC.e as USDC.e', () => {
    expect(
      sanitizeTokenSymbol('USDC.e', {
        chainId: ChainId.Superposition,
        erc20L1Address: CommonAddress.Superposition.USDCe,
      }),
    ).toBe('USDC.e');
  });

  it('keeps Ethereum USDC as USDC', () => {
    expect(
      sanitizeTokenSymbol('USDC', {
        chainId: ChainId.Ethereum,
        erc20L1Address: CommonAddress.Ethereum.USDC,
      }),
    ).toBe('USDC');
  });

  it('keeps ApeChain USDC.e as USDC.e', () => {
    expect(
      sanitizeTokenSymbol('USDC.e', {
        chainId: ChainId.ApeChain,
        erc20L1Address: CommonAddress.ApeChain.USDCe,
      }),
    ).toBe('USDC.e');
  });
});

describe('sanitizeTokenName', () => {
  it('keeps Superposition USDC.e as Bridged USDC', () => {
    expect(
      sanitizeTokenName('Bridged USDC', {
        chainId: ChainId.Superposition,
        erc20L1Address: CommonAddress.Superposition.USDCe,
      }),
    ).toBe('Bridged USDC');
  });
});

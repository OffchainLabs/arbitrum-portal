import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../CommonAddressUtils';
import orbitChainsData from '../orbitChainsData.json';
import {
  decodeChainQueryParam,
  sanitizeNullSelectedToken,
  sanitizeQueryParams,
} from '../queryParamUtils';

describe('sanitizeNullSelectedToken', () => {
  beforeAll(() => {
    registerCustomArbitrumNetwork(
      orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.ApeChain)!,
    );
  });

  describe('with ERC20 token', () => {
    it('should return ERC20 address for ApeChain → Ethereum with USDC', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.Ethereum,
        erc20ParentAddress: CommonAddress.Ethereum.USDC,
      });

      expect(result).toBe(CommonAddress.Ethereum.USDC);
    });

    it('should return ERC20 address for Ethereum → ApeChain with USDC', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: CommonAddress.Ethereum.USDC,
      });

      expect(result).toBe(CommonAddress.Ethereum.USDC);
    });

    it('should return ERC20 address for Base → ApeChain with USDC', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Base,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: CommonAddress.Base.USDC,
      });

      expect(result).toBe(CommonAddress.Base.USDC);
    });

    it('should return ERC20 address for ArbitrumOne → ApeChain with USDC', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: CommonAddress.ArbitrumOne.USDC,
      });

      expect(result).toBe(CommonAddress.ArbitrumOne.USDC);
    });
  });

  describe('without token (native currency)', () => {
    it('should return null for ApeChain → Ethereum without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.Ethereum,
        erc20ParentAddress: null,
      });

      expect(result).toBe(null);
    });

    it('should return null for ApeChain → ArbitrumOne without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.ArbitrumOne,
        erc20ParentAddress: null,
      });

      expect(result).toBe(null);
    });

    it('should return null for Base → ApeChain without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Base,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: null,
      });

      expect(result).toBe(null);
    });

    it('should return null for Ethereum → ApeChain without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: null,
      });

      expect(result).toBe(null);
    });

    it('should return null for ArbitrumOne → ApeChain without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: null,
      });

      expect(result).toBe(null);
    });
  });
});

describe('sanitizeQueryParams - Arbitrum Nova pairs', () => {
  beforeAll(() => {
    registerCustomArbitrumNetwork(
      orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.ApeChain)!,
    );
  });

  it('preserves Ethereum → Nova when LiFi pairs are enabled', () => {
    const result = sanitizeQueryParams({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumNova,
      includeLifiEnabledChainPairs: true,
    });

    expect(result).toEqual({
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumNova,
    });
  });

  it('preserves Nova → Ethereum', () => {
    const result = sanitizeQueryParams({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.Ethereum,
      includeLifiEnabledChainPairs: true,
    });

    expect(result).toEqual({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.Ethereum,
    });
  });

  it('preserves Nova → ArbitrumOne', () => {
    const result = sanitizeQueryParams({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.ArbitrumOne,
      includeLifiEnabledChainPairs: true,
    });

    expect(result).toEqual({
      sourceChainId: ChainId.ArbitrumNova,
      destinationChainId: ChainId.ArbitrumOne,
    });
  });

  it('rejects ArbitrumOne → Nova and re-routes to a valid destination', () => {
    const result = sanitizeQueryParams({
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.ArbitrumNova,
      includeLifiEnabledChainPairs: true,
    });

    expect(result.sourceChainId).toBe(ChainId.ArbitrumOne);
    expect(result.destinationChainId).not.toBe(ChainId.ArbitrumNova);
  });
});

const sourceNetworks = vi.hoisted(() => ({ additionalSourceChainIds: [] as number[] }));
vi.mock('@/app/src/walletConfig', () => sourceNetworks);

describe.sequential('Solana query parameters', () => {
  afterEach(() => {
    sourceNetworks.additionalSourceChainIds.length = 0;
  });
  it('discards Solana when it is absent from supported sources', () => {
    expect(decodeChainQueryParam('solana')).toBeUndefined();
    expect(decodeChainQueryParam(String(ChainId.Solana))).toBeUndefined();
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
      }).sourceChainId,
    ).not.toBe(ChainId.Solana);
  });
  it('preserves a configured Solana source', () => {
    sourceNetworks.additionalSourceChainIds.push(ChainId.Solana);
    expect(decodeChainQueryParam('solana')).toBe(ChainId.Solana);
    expect(decodeChainQueryParam(String(ChainId.Solana))).toBe(ChainId.Solana);
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
      }),
    ).toEqual({ sourceChainId: ChainId.Solana, destinationChainId: ChainId.ArbitrumOne });
  });
  it('always removes a Solana destination', () => {
    sourceNetworks.additionalSourceChainIds.push(ChainId.Solana);
    expect(
      sanitizeQueryParams({ sourceChainId: ChainId.Ethereum, destinationChainId: ChainId.Solana })
        .destinationChainId,
    ).not.toBe(ChainId.Solana);
  });
});

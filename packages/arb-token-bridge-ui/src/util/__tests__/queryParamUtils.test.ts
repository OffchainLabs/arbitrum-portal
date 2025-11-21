import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../CommonAddressUtils';
import orbitChainsData from '../orbitChainsData.json';
import { sanitizeNullSelectedToken } from '../queryParamUtils';

describe('sanitizeNullSelectedToken', () => {
  beforeAll(() => {
    registerCustomArbitrumNetwork(
      orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.ApeChain)!,
    );
    registerCustomArbitrumNetwork(
      orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.Superposition)!,
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

    it('should return ERC20 address for Superposition → Ethereum with USDC', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Superposition,
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

    it('should return null for Superposition → ApeChain without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Superposition,
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

    it('should return null for Ethereum → Superposition without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.Superposition,
        erc20ParentAddress: null,
      });

      expect(result).toBe(null);
    });
  });
});

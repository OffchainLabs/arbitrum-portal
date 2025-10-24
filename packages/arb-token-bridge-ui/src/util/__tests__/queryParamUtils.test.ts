import { constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../CommonAddressUtils';
import { sanitizeNullSelectedToken } from '../queryParamUtils';

describe('sanitizeNullSelectedToken', () => {
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
    it('should return AddressZero for ApeChain → Ethereum without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.Ethereum,
        erc20ParentAddress: null,
      });

      expect(result).toBe(constants.AddressZero);
    });

    it('should return AddressZero for ApeChain → ArbitrumOne without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.ArbitrumOne,
        erc20ParentAddress: null,
      });

      expect(result).toBe(constants.AddressZero);
    });

    it('should return AddressZero for Base → ApeChain without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Base,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: null,
      });

      expect(result).toBe(constants.AddressZero);
    });

    it('should return AddressZero for Superposition → ApeChain without token', () => {
      const result = sanitizeNullSelectedToken({
        sourceChainId: ChainId.Superposition,
        destinationChainId: ChainId.ApeChain,
        erc20ParentAddress: null,
      });

      expect(result).toBe(constants.AddressZero);
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

import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { constants } from 'ethers';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ether } from '../../../constants';
import { ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { isBlockedOftDeposit } from '../../../util/WithdrawOnlyUtils';
import orbitChainsData from '../../../util/orbitChainsData.json';
import { isArbitrumCanonicalTransfer } from './useIsCanonicalTransfer';

vi.mock('../../../util/WithdrawOnlyUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../util/WithdrawOnlyUtils')>();
  return {
    ...actual,
    isBlockedOftDeposit: vi.fn().mockResolvedValue(false),
  };
});

const usdcToken: ERC20BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
  type: TokenType.ERC20,
  name: 'USDC',
  listIds: new Set<string>(),
};

describe('isArbitrumCanonicalTransfer', () => {
  beforeAll(() => {
    registerCustomArbitrumNetwork(
      orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.ApeChain)!,
    );
    registerCustomArbitrumNetwork(
      orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.Superposition)!,
    );
    registerCustomArbitrumNetwork(
      orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.RobinhoodChain)!,
    );
  });

  describe('for deposits', () => {
    it('should return true from Ethereum to Arbitrum One', async () => {
      const ethDeposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(ethDeposit).toBe(true);

      const erc20Deposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken,
        isSwap: false,
      });
      expect(erc20Deposit).toBe(true);
    });

    it('should return false for withdraw only token', async () => {
      const erc20Deposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: true,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken,
        isSwap: false,
      });
      expect(erc20Deposit).toBe(false);
    });

    it('should return false for LayerZero token', async () => {
      vi.mocked(isBlockedOftDeposit).mockResolvedValueOnce(true);

      const erc20Deposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken,
        isSwap: false,
      });
      expect(erc20Deposit).toBe(false);
    });

    it('should return false from Base to Arbitrum One', async () => {
      const baseDeposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Base,
        sourceChainId: ChainId.Base,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(baseDeposit).toBe(false);
    });

    it('should return false for disabled token', async () => {
      const deposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          address: '0x0ff5A8451A839f5F0BB3562689D9A44089738D11', // rDPX
          decimals: 18,
          symbol: 'rDPX',
          type: TokenType.ERC20,
          name: 'rDPX',
          listIds: new Set<string>(),
        },
        isSwap: false,
      });
      expect(deposit).toBe(false);
    });

    it('should return from ArbitrumOne to ApeChain', async () => {
      const apeDeposit = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ApeChain,
        childChainId: ChainId.ApeChain,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(apeDeposit).toBe(true);

      const ethDeposit = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ApeChain,
        childChainId: ChainId.ApeChain,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          ...ether,
          type: TokenType.ERC20,
          address: constants.AddressZero,
          l2Address: CommonAddress.ApeChain.WETH,
          listIds: new Set<string>(),
        },
        isSwap: false,
      });
      expect(ethDeposit).toBe(false);
    });

    it('should return from ArbitrumOne to Superposition', async () => {
      const ethDeposit = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Superposition,
        childChainId: ChainId.Superposition,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(ethDeposit).toBe(true);

      const usdcDeposit = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Superposition,
        childChainId: ChainId.Superposition,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          ...usdcToken,
          address: CommonAddress.ArbitrumOne.USDC,
        },
        isSwap: false,
      });
      expect(usdcDeposit).toBe(true);
    });

    it('Should return true for USDC transfers', async () => {
      const usdcDeposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          ...usdcToken,
          address: CommonAddress.Ethereum.USDC,
          l2Address: CommonAddress.ArbitrumOne['USDC.e'],
        },
        isSwap: false,
      });
      expect(usdcDeposit).toBe(true);
    });

    it.each([
      {
        symbol: 'USDe',
        address: CommonAddress.Ethereum.USDe,
        l2Address: CommonAddress.RobinhoodChain.USDe,
      },
      {
        symbol: 'USDG',
        address: CommonAddress.Ethereum.USDG,
        l2Address: CommonAddress.RobinhoodChain.USDG,
      },
    ])('should return false for Robinhood LiFi-only $symbol deposits', async (token) => {
      const deposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.RobinhoodChain,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.RobinhoodChain,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          ...token,
          decimals: 18,
          name: token.symbol,
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
        isSwap: false,
      });

      expect(deposit).toBe(false);
    });
  });

  describe('for withdrawals', () => {
    it('should return true from Arbitrum One to Ethereum', async () => {
      const ethWithdrawal = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(ethWithdrawal).toBe(true);

      const erc20Withdrawal = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken,
        isSwap: false,
      });
      expect(erc20Withdrawal).toBe(true);
    });

    it('should return true for withdraw only token', async () => {
      const erc20Withdrawal = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: true,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken,
        isSwap: false,
      });
      expect(erc20Withdrawal).toBe(true);
    });

    it('should return false from Arbitrum One to Base', async () => {
      const baseWithdrawal = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Base,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Base,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(baseWithdrawal).toBe(false);
    });

    it('should return false for disabled token', async () => {
      const withdrawal = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          address: '0x43df01681966d5339702e96ef039e481b9da20c1', // FU
          decimals: 18,
          symbol: 'FU',
          type: TokenType.ERC20,
          name: 'FU',
          listIds: new Set<string>(),
        },
        isSwap: false,
      });
      expect(withdrawal).toBe(false);
    });

    it('should return from ApeChain to ArbitrumOne', async () => {
      const apeWithdraw = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.ApeChain,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(apeWithdraw).toBe(true);

      const wethWithdraw = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.ApeChain,
        destinationChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.ApeChain,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          address: constants.AddressZero,
          decimals: 18,
          l2Address: CommonAddress.ApeChain.WETH,
          listIds: new Set<string>(['33139_lifi']),
          logoURI: '',
          name: 'Wrapped Ether',
          symbol: 'WETH',
          type: TokenType.ERC20,
        },
        isSwap: false,
      });
      expect(wethWithdraw).toBe(false);
    });

    it('should return from Superposition to ArbitrumOne', async () => {
      const ethWithdraw = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.Superposition,
        destinationChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.Superposition,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: false,
      });
      expect(ethWithdraw).toBe(true);

      const usdcWithdraw = await isArbitrumCanonicalTransfer({
        sourceChainId: ChainId.Superposition,
        destinationChainId: ChainId.ArbitrumOne,
        childChainId: ChainId.Superposition,
        parentChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          ...usdcToken,
          address: CommonAddress.ArbitrumOne.USDC,
        },
        isSwap: false,
      });
      expect(usdcWithdraw).toBe(true);
    });

    it.each([
      {
        symbol: 'USDe',
        address: CommonAddress.Ethereum.USDe,
        l2Address: CommonAddress.RobinhoodChain.USDe,
      },
      {
        symbol: 'USDG',
        address: CommonAddress.Ethereum.USDG,
        l2Address: CommonAddress.RobinhoodChain.USDG,
      },
    ])('should return false for Robinhood LiFi-only $symbol withdrawals', (token) => {
      const withdrawal = isArbitrumCanonicalTransfer({
        childChainId: ChainId.RobinhoodChain,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.RobinhoodChain,
        destinationChainId: ChainId.Ethereum,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          ...token,
          decimals: 18,
          name: token.symbol,
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
        isSwap: false,
      });

      expect(withdrawal).toBe(false);
    });
  });

  describe('for swaps', () => {
    it('should return false for any swap', async () => {
      const ethDeposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: null,
        isSwap: true,
      });
      expect(ethDeposit).toBe(false);

      const erc20Deposit = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.ArbitrumOne,
        parentChainId: ChainId.Ethereum,
        sourceChainId: ChainId.Ethereum,
        destinationChainId: ChainId.ArbitrumOne,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: usdcToken,
        isSwap: true,
      });
      expect(erc20Deposit).toBe(false);

      const ethDeposit2 = await isArbitrumCanonicalTransfer({
        childChainId: ChainId.Superposition,
        parentChainId: ChainId.ArbitrumOne,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Superposition,
        isSelectedTokenWithdrawOnly: false,
        isSelectedTokenWithdrawOnlyLoading: false,
        selectedToken: {
          address: constants.AddressZero, // rDPX
          decimals: 18,
          symbol: 'ETH',
          type: TokenType.ERC20,
          name: 'ETH',
          listIds: new Set<string>(),
        },
        isSwap: false,
      });
      expect(ethDeposit2).toBe(true);
    });
  });
});

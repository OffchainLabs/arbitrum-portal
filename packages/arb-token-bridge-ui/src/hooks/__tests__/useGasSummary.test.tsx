import { renderHook } from '@testing-library/react';
import { BigNumber, constants } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAmountBigNumber } from '../../components/TransferPanel/hooks/useAmountBigNumber';
import { createMockLifiRoute } from '../../test-utils/lifi';
import { SolanaTransferStarter } from '../../token-bridge-sdk/SolanaTransferStarter';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import * as estimates from '../TransferPanel/useGasEstimates';
import { getGasSummaryStatus, useGasSummary } from '../TransferPanel/useGasSummary';

vi.mock('../TransferPanel/useSelectedTokenDecimals', () => ({
  useSelectedTokenDecimals: vi.fn().mockReturnValue(18),
}));

vi.mock('../../components/TransferPanel/hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: vi.fn(),
}));

vi.mock('../useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: {
        id: ChainId.Solana,
        nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
      },
      destinationChain: {
        id: ChainId.ArbitrumOne,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      },
    },
  ],
}));
vi.mock('../useSelectedToken', () => ({ useSelectedToken: () => [null] }));
vi.mock('../useBalanceOnSourceChain', () => ({
  useBalanceOnSourceChain: () => BigNumber.from(1000000000),
}));
vi.mock('../useGasPrice', () => ({ useGasPrice: () => constants.Zero }));

describe('getGasSummaryStatus', () => {
  describe('given the following combinations of amount and balance', () => {
    const mockedGasSummaryParams = {
      selectedTokenAddress: '0x123',
      isDepositMode: true,
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: null,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum,
    };

    it('should return success if both amount and balance are zero', async () => {
      const result = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: constants.Zero,
      });
      expect(result).toEqual('success');
    });

    it('should return insufficientBalance if amount is lower than balance', async () => {
      const result = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: constants.Zero,
      });
      expect(result).toEqual('insufficientBalance');
    });

    it('should return loading if balance is null', async () => {
      const result1 = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: null,
      });
      expect(result1).toEqual('loading');

      const result2 = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: null,
      });
      expect(result2).toEqual('loading');
    });
  });

  it('should return error if there is a gas estimate error', async () => {
    const result = getGasSummaryStatus({
      selectedTokenAddress: '0x123',
      gasEstimatesError: new Error('cannot estimate gas'),
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum,
    });
    expect(result).toEqual('error');
  });

  it('should return unavailable if UI is withdrawal mode from Arbitrum One to Ethereum and selected token is Arbitrum One native USDC', async () => {
    const result = getGasSummaryStatus({
      selectedTokenAddress: CommonAddress.ArbitrumOne.USDC,
      gasEstimatesError: 'walletNotConnected',
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum,
    });
    expect(result).toEqual('unavailable');
  });

  it('should return unavailable if UI is withdrawal mode from Arbitrum Sepolia to Sepolia and selected token is Arbitrum Sepolia native USDC', async () => {
    const result = getGasSummaryStatus({
      selectedTokenAddress: CommonAddress.ArbitrumSepolia.USDC,
      gasEstimatesError: 'walletNotConnected',
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      sourceChainId: ChainId.ArbitrumSepolia,
      destinationChainId: ChainId.Sepolia,
    });
    expect(result).toEqual('unavailable');
  });
});

describe('useGasSummary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses starter quote fees in each native currency without an EVM gas price', async () => {
    const sol = { address: '11111111111111111111111111111111', symbol: 'SOL', decimals: 9 };
    const eth = { address: constants.AddressZero, symbol: 'ETH', decimals: 18 };
    const starter = new SolanaTransferStarter({
      lifiRoute: {
        type: 'lifi',
        durationMs: 1,
        fromChainId: ChainId.Solana,
        toChainId: ChainId.ArbitrumOne,
        fromAmount: { amount: '1', amountUSD: '1', token: sol },
        toAmount: { amount: '1', amountUSD: '1', token: eth },
        fee: [],
        gas: [
          {
            chainId: ChainId.Solana,
            amount: '7500',
            token: sol,
            details: { id: 'source', label: 'Gas fee', via: 'LI.FI' },
          },
          {
            chainId: ChainId.ArbitrumOne,
            amount: '1000000000000',
            token: eth,
            details: { id: 'destination', label: 'Gas fee', via: 'LI.FI' },
          },
        ],
        protocolData: { route: createMockLifiRoute() },
      },
    });
    vi.mocked(useAmountBigNumber).mockReturnValue(constants.One);
    vi.spyOn(estimates, 'useGasEstimates').mockReturnValue({
      gasEstimates: await starter.transferEstimateGas(),
      error: undefined,
    });
    const { result } = renderHook(() => useGasSummary());
    expect(result.current).toEqual({
      status: 'success',
      estimatedParentChainGasFees: 0.0000075,
      estimatedChildChainGasFees: 0.000001,
    });
  });
});

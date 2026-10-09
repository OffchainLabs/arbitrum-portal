import { renderHook } from '@testing-library/react';
import { BigNumber, constants } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMockLifiRoute } from '../../test-utils/lifi';
import { SolanaTransferStarter } from '../../token-bridge-sdk/SolanaTransferStarter';
import { ChainId } from '../../types/ChainId';
import * as estimates from '../TransferPanel/useGasEstimates';
import { useGasSummary } from '../TransferPanel/useGasSummary';

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
vi.mock('../useGasPrice', () => ({ useGasPrice: () => undefined }));
vi.mock('../../components/TransferPanel/hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: () => constants.One,
}));

afterEach(() => vi.restoreAllMocks());

describe('Solana gas summary', () => {
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

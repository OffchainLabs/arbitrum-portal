import { renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '../../test-utils/wallet-test-wrapper';
import { OftV2TransferStarter } from '../../token-bridge-sdk/OftV2TransferStarter';
import { getOftV2TransferConfig } from '../../token-bridge-sdk/oftUtils';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { useOftV2FeeEstimates } from './useOftV2FeeEstimates';

describe.sequential('useOftV2FeeEstimates', () => {
  afterEach(() => vi.restoreAllMocks());

  it('disables the query for a transfer that does not use OFT', async () => {
    const fetch = vi.spyOn(OftV2TransferStarter.prototype, 'transferEstimateFee');
    const wrapper = createWalletTestWrapper({
      wallets: defaultWalletContextValue,
      query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
    });
    const { result } = renderHook(
      () => useOftV2FeeEstimates({ sourceChainErc20Address: undefined }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feeEstimates).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches fees for a valid OFT transfer', async () => {
    const feeEstimates = {
      sourceChainGasFee: BigNumber.from(10),
      destinationChainGasFee: BigNumber.from(20),
    };
    const fetch = vi
      .spyOn(OftV2TransferStarter.prototype, 'transferEstimateFee')
      .mockResolvedValue({
        estimatedSourceChainFee: BigNumber.from(10),
        estimatedDestinationChainFee: BigNumber.from(20),
      });
    const wrapper = createWalletTestWrapper({
      wallets: defaultWalletContextValue,
      query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
    });
    const { result } = renderHook(
      () => useOftV2FeeEstimates({ sourceChainErc20Address: CommonAddress.Ethereum.USDT }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.feeEstimates).toEqual(feeEstimates));
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '0x0000000000000000000000000000000000000000',
        amount: BigNumber.from(1),
      }),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it.each([
    {
      sourceChainId: ChainId.Solana,
      destinationChainId: ChainId.ArbitrumOne,
      sourceChainErc20Address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    },
    {
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.Solana,
      sourceChainErc20Address: CommonAddress.Ethereum.USDT,
    },
  ])('disables OFT for $sourceChainId to $destinationChainId', (params) => {
    expect(getOftV2TransferConfig(params).isValid).toBe(false);
  });
});

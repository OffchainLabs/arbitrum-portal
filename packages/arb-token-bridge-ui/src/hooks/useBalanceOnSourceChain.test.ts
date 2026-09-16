import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { createBalanceTestWrapper } from '../test-utils/balance-test-wrapper';
import { ChainId } from '../types/ChainId';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../wallet/constants';
import type { WalletContextValue } from '../wallet/types';
import { useBalanceOnSourceChain } from './useBalanceOnSourceChain';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';

vi.mock('./useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
vi.mock('./useNetworks', () => ({ useNetworks: vi.fn() }));

afterEach(cleanup);

describe('useBalanceOnSourceChain', () => {
  it('uses the Solana wallet and native sentinel', async () => {
    const sourceAddress = 'So11111111111111111111111111111111111111112';
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Solana),
        sourceChainProvider: getProviderForChainId(ChainId.Solana),
        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
    let wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      solana: {
        ...defaultWalletContextValue.solana,
        account: {
          ecosystem: 'solana',
          address: 'So11111111111111111111111111111111111111112',
          chainId: ChainId.Solana,
          status: 'connected',
        },
        isConnected: true,
      },
    };
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
    const fetchBalance = vi.fn(async () => ({ [SOLANA_NATIVE_TOKEN_ADDRESS]: 123n }));
    const wrapper = createBalanceTestWrapper(() => wallets, fetchBalance);

    const { result, rerender } = renderHook(() => useBalanceOnSourceChain(null), { wrapper });

    await waitFor(() => expect(result.current).toEqual(BigNumber.from(123)));
    expect(useNativeCurrency).toHaveBeenCalledWith({
      chainId: ChainId.ArbitrumOne,
    });
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.Solana,
      walletAddress: sourceAddress,
      tokenAddresses: [SOLANA_NATIVE_TOKEN_ADDRESS],
    });

    wallets = { ...wallets, solana: defaultWalletContextValue.solana };
    rerender();
    expect(result.current).toBeNull();
  });
});

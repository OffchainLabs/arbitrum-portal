import { renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../wallet/constants';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';
import { useWallets } from '../wallet/hooks/useWallets';
import { useBalanceOnSourceChain } from './useBalanceOnSourceChain';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';

vi.mock('../wallet/hooks/useTokenBalances', () => ({ useTokenBalances: vi.fn() }));
vi.mock('../wallet/hooks/useWallets', () => ({ useWallets: vi.fn() }));
vi.mock('./useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
vi.mock('./useNetworks', () => ({ useNetworks: vi.fn() }));

describe('useBalanceOnSourceChain', () => {
  it('uses the Solana wallet and native sentinel', () => {
    const sourceAddress = 'So11111111111111111111111111111111111111112';
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Solana),

        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
    vi.mocked(useWallets).mockReturnValue({
      sourceWallet: {
        ecosystem: 'solana',
        account: {
          ecosystem: 'solana',
          address: sourceAddress,
          chainId: ChainId.Solana,
          status: 'connected',
        },
        isConnected: true,
        disconnect: vi.fn(),
      },
      destinationWallet: {
        ecosystem: 'evm',
        account: { ecosystem: 'evm', status: 'disconnected' },
        isConnected: false,
        disconnect: vi.fn(),
      },
    });
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
    vi.mocked(useTokenBalances).mockReturnValue({
      data: { [SOLANA_NATIVE_TOKEN_ADDRESS]: 123n },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    const { result, rerender } = renderHook(() => useBalanceOnSourceChain(null));

    expect(result.current).toEqual(BigNumber.from(123));
    expect(useNativeCurrency).toHaveBeenCalledWith({
      chainId: ChainId.ArbitrumOne,
    });
    expect(useTokenBalances).toHaveBeenCalledWith({
      chainId: ChainId.Solana,
      walletAddress: sourceAddress,
      tokenAddresses: [SOLANA_NATIVE_TOKEN_ADDRESS],
    });

    const wallets = vi.mocked(useWallets)();
    vi.mocked(useWallets).mockReturnValue({
      ...wallets,
      sourceWallet: {
        ...wallets.sourceWallet,
        ecosystem: 'solana',
        account: { ecosystem: 'solana', status: 'disconnected' },
        isConnected: false,
      },
    });
    rerender();
    expect(result.current).toBeNull();
  });
});

import { renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';
import { useWallets } from '../wallet/hooks/useWallets';
import { TokenType } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useBalanceOnDestinationChain } from './useBalanceOnDestinationChain';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';

vi.mock('../wallet/hooks/useTokenBalances', () => ({ useTokenBalances: vi.fn() }));
vi.mock('../wallet/hooks/useWallets', () => ({ useWallets: vi.fn() }));
vi.mock('./useArbQueryParams', () => ({ useArbQueryParams: vi.fn() }));
vi.mock('./useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
vi.mock('./useNetworks', () => ({ useNetworks: vi.fn() }));

describe('useBalanceOnDestinationChain', () => {
  it('fetches the resolved token for a custom recipient', () => {
    const connectedAddress = '0x1111111111111111111111111111111111111111';
    const recipientAddress = '0x2222222222222222222222222222222222222222';
    const parentTokenAddress = '0x3333333333333333333333333333333333333333';
    const childTokenAddress = '0x4444444444444444444444444444444444444444';
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),

        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
    vi.mocked(useArbQueryParams).mockReturnValue([
      { destinationAddress: recipientAddress },
      vi.fn(),
    ] as unknown as ReturnType<typeof useArbQueryParams>);
    vi.mocked(useWallets).mockReturnValue({
      sourceWallet: {
        ecosystem: 'evm',
        account: { ecosystem: 'evm', status: 'disconnected' },
        isConnected: false,
        disconnect: vi.fn(),
      },
      destinationWallet: {
        ecosystem: 'evm',
        account: {
          ecosystem: 'evm',
          address: connectedAddress,
          chainId: ChainId.ArbitrumOne,
          status: 'connected',
        },
        isConnected: true,
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
      data: { [childTokenAddress]: 321n },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    });

    const { result, rerender } = renderHook(() =>
      useBalanceOnDestinationChain({
        address: parentTokenAddress,
        l2Address: childTokenAddress,
        name: 'Token',
        symbol: 'TKN',
        decimals: 18,
        type: TokenType.ERC20,
        listIds: new Set(),
      }),
    );

    expect(result.current).toEqual(BigNumber.from(321));
    expect(useTokenBalances).toHaveBeenCalledWith({
      chainId: ChainId.ArbitrumOne,
      walletAddress: recipientAddress,
      tokenAddresses: [childTokenAddress],
    });

    const wallets = vi.mocked(useWallets)();
    vi.mocked(useWallets).mockReturnValue({
      ...wallets,
      destinationWallet: {
        ...wallets.destinationWallet,
        ecosystem: 'evm',
        account: { ecosystem: 'evm', status: 'disconnected' },
        isConnected: false,
      },
    });
    rerender();
    expect(result.current).toEqual(BigNumber.from(321));

    const [params, setParams] = vi.mocked(useArbQueryParams)();
    vi.mocked(useArbQueryParams).mockReturnValue([
      { ...params, destinationAddress: undefined },
      setParams,
    ]);
    rerender();
    expect(result.current).toBeNull();
  });
});

import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { createBalanceTestWrapper } from '../test-utils/balance-test-wrapper';
import { ChainId } from '../types/ChainId';
import { getWagmiChain } from '../util/wagmi/getWagmiChain';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import type { WalletContextValue } from '../wallet/types';
import { TokenType } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useBalanceOnDestinationChain } from './useBalanceOnDestinationChain';
import { useNativeCurrency } from './useNativeCurrency';
import { useNetworks } from './useNetworks';

vi.mock('./useArbQueryParams', () => ({ useArbQueryParams: vi.fn() }));
vi.mock('./useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
vi.mock('./useNetworks', () => ({ useNetworks: vi.fn() }));

afterEach(cleanup);

describe('useBalanceOnDestinationChain', () => {
  it('fetches the resolved token for a custom recipient', async () => {
    const connectedAddress = '0x1111111111111111111111111111111111111111';
    const recipientAddress = '0x2222222222222222222222222222222222222222';
    const parentTokenAddress = '0x3333333333333333333333333333333333333333';
    const childTokenAddress = '0x4444444444444444444444444444444444444444';
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),
        sourceChainProvider: getProviderForChainId(ChainId.Ethereum),
        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
    vi.mocked(useArbQueryParams).mockReturnValue([
      { destinationAddress: recipientAddress },
      vi.fn(),
    ] as unknown as ReturnType<typeof useArbQueryParams>);
    let wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      evm: {
        ...defaultWalletContextValue.evm,
        account: {
          ecosystem: 'evm',
          address: connectedAddress,
          chainId: ChainId.ArbitrumOne,
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
    const fetchBalance = vi.fn(async () => ({ [childTokenAddress]: 321n }));
    const wrapper = createBalanceTestWrapper(() => wallets, fetchBalance);

    const { result, rerender } = renderHook(
      () =>
        useBalanceOnDestinationChain({
          address: parentTokenAddress,
          l2Address: childTokenAddress,
          name: 'Token',
          symbol: 'TKN',
          decimals: 18,
          type: TokenType.ERC20,
          listIds: new Set(),
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current).toEqual(BigNumber.from(321)));
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.ArbitrumOne,
      walletAddress: recipientAddress,
      tokenAddresses: [childTokenAddress],
    });

    wallets = { ...wallets, evm: defaultWalletContextValue.evm };
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

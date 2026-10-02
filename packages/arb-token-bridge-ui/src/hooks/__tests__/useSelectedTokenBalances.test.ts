import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { createBalanceTestWrapper } from '../../test-utils/balance-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { useSelectedTokenBalances } from '../TransferPanel/useSelectedTokenBalances';
import { TokenType } from '../arbTokenBridge.types';
import { useNativeCurrency } from '../useNativeCurrency';
import { useNetworks } from '../useNetworks';
import { useSelectedToken } from '../useSelectedToken';

vi.mock('../useSelectedToken', () => ({ useSelectedToken: vi.fn() }));
vi.mock('../useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('../useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
vi.mock('../useArbQueryParams', () => ({ useArbQueryParams: () => [{}] }));

afterEach(cleanup);

describe('useSelectedTokenBalances', () => {
  const token = {
    type: TokenType.ERC20 as const,
    decimals: 18,
    name: 'Random',
    symbol: 'RAND',
    address: '0x1111111111111111111111111111111111111111',
    l2Address: '0x2222222222222222222222222222222222222222',
    listIds: new Set(['1']),
  };
  const wallets = {
    ...defaultWalletContextValue,
    evm: {
      ...defaultWalletContextValue.evm,
      account: {
        ecosystem: 'evm',
        status: 'connected',
        address: '0x3333333333333333333333333333333333333333',
        chainId: ChainId.Ethereum,
      } as const,
      isConnected: true,
    },
  };

  beforeEach(() => {
    vi.mocked(useSelectedToken).mockReturnValue([token, vi.fn()]);
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),
        sourceChainProvider: getProviderForChainId(ChainId.Ethereum),
        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
  });

  it('returns independently selected source and destination balances', async () => {
    const fetchBalance = vi.fn(async ({ chainId, tokenAddresses }) =>
      Object.fromEntries(
        tokenAddresses.map((address: string) => [
          address,
          chainId === ChainId.Ethereum ? 200_000n : 400_000n,
        ]),
      ),
    );
    const wrapper = createBalanceTestWrapper(() => wallets, fetchBalance);
    const { result } = renderHook(useSelectedTokenBalances, { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({
        sourceBalance: BigNumber.from(200_000),
        destinationBalance: BigNumber.from(400_000),
      }),
    );
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.Ethereum,
      walletAddress: wallets.evm.account.address,
      tokenAddresses: [token.address],
    });
    expect(fetchBalance).toHaveBeenCalledWith({
      chainId: ChainId.ArbitrumOne,
      walletAddress: wallets.evm.account.address,
      tokenAddresses: [token.l2Address],
    });
  });

  it('requests native balances when no token is selected', async () => {
    vi.mocked(useSelectedToken).mockReturnValue([null, vi.fn()]);
    const wrapper = createBalanceTestWrapper(
      () => wallets,
      async ({ chainId }) => ({
        [zeroAddress]: chainId === ChainId.Ethereum ? 100_000n : 300_000n,
      }),
    );
    const { result } = renderHook(useSelectedTokenBalances, { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({
        sourceBalance: BigNumber.from(100_000),
        destinationBalance: BigNumber.from(300_000),
      }),
    );
  });
});

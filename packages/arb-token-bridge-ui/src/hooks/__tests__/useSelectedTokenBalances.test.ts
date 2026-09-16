import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { useSelectedTokenBalances } from '../TransferPanel/useSelectedTokenBalances';
import { TokenType } from '../arbTokenBridge.types';

afterEach(cleanup);

describe.sequential('useSelectedTokenBalances', () => {
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

  it('returns independently selected source and destination balances', async () => {
    const fetchBalance = vi.fn(async ({ chainId, tokenAddresses }) =>
      Object.fromEntries(
        tokenAddresses.map((address: string) => [
          address,
          chainId === ChainId.Ethereum ? 200_000n : 400_000n,
        ]),
      ),
    );
    const wrapper = createBridgeTestWrapper({
      query: {
        sourceChain: ChainId.Ethereum,
        destinationChain: ChainId.ArbitrumOne,
        token: token.address,
      },
      wallets,
      fetchBalance,
      bridgeTokens: { [token.address]: token },
    });
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
    const wrapper = createBridgeTestWrapper({
      query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
      wallets,
      fetchBalance: async ({ chainId }) => ({
        [zeroAddress]: chainId === ChainId.Ethereum ? 100_000n : 300_000n,
      }),
    });
    const { result } = renderHook(useSelectedTokenBalances, { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({
        sourceBalance: BigNumber.from(100_000),
        destinationBalance: BigNumber.from(300_000),
      }),
    );
  });
});

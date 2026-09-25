import { renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { useNativeCurrency } from '../../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../../hooks/useNetworks';
import { ChainId } from '../../../../types/ChainId';
import { CommonAddress } from '../../../../util/CommonAddressUtils';
import { getWagmiChain } from '../../../../util/wagmi/getWagmiChain';
import { useTokenBalances } from '../../../../wallet/hooks/useTokenBalances';
import { useWallets } from '../../../../wallet/hooks/useWallets';
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances';

vi.mock('../../../../hooks/useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('../../../../hooks/useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
const query = vi.hoisted((): { destinationAddress?: string } => ({}));
vi.mock('../../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [query],
}));
vi.mock('../../../../wallet/hooks/useTokenBalances', () => ({ useTokenBalances: vi.fn() }));
vi.mock('../../../../wallet/hooks/useWallets', () => ({ useWallets: vi.fn() }));

const sourceAddress = '0x1111111111111111111111111111111111111111';
const destinationAddress = '0x2222222222222222222222222222222222222222';

describe.sequential('useNativeCurrencyBalances', () => {
  beforeEach(() => {
    query.destinationAddress = undefined;
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
    vi.mocked(useWallets).mockReturnValue({
      sourceWallet: {
        ecosystem: 'evm',
        account: {
          ecosystem: 'evm',
          address: sourceAddress,
          chainId: ChainId.Sepolia,
          status: 'connected',
        },
        isConnected: true,
        disconnect: vi.fn(),
      },
      destinationWallet: {
        ecosystem: 'evm',
        account: {
          ecosystem: 'evm',
          address: destinationAddress,
          chainId: ChainId.ArbitrumSepolia,
          status: 'connected',
        },
        isConnected: true,
        disconnect: vi.fn(),
      },
    });
  });

  it('uses the custom recipient for holdings and the connected payer for destination gas', () => {
    const recipient = '0x3333333333333333333333333333333333333333';
    query.destinationAddress = recipient;
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
      },
      vi.fn(),
    ]);
    vi.mocked(useTokenBalances).mockImplementation(({ walletAddress }) => ({
      data: { [zeroAddress]: walletAddress === recipient ? 900n : 100n },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }));
    const { result } = renderHook(useNativeCurrencyBalances);
    expect(result.current.destinationBalance).toEqual(BigNumber.from(900));
    expect(result.current.destinationGasBalance).toEqual(BigNumber.from(100));
  });

  it('selects the source and destination wallets independently', () => {
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
      },
      vi.fn(),
    ]);
    vi.mocked(useTokenBalances).mockImplementation(({ walletAddress }) => ({
      data:
        walletAddress === sourceAddress ? { [zeroAddress]: 100_000n } : { [zeroAddress]: 300_000n },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }));

    const { result, rerender } = renderHook(useNativeCurrencyBalances);

    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(100_000),
      sourceGasBalance: BigNumber.from(100_000),
      destinationBalance: BigNumber.from(300_000),
      destinationGasBalance: BigNumber.from(300_000),
    });

    const wallets = vi.mocked(useWallets)();
    vi.mocked(useWallets).mockReturnValue({
      ...wallets,
      sourceWallet: {
        ...wallets.sourceWallet,
        ecosystem: 'evm',
        account: { ecosystem: 'evm', status: 'disconnected' },
        isConnected: false,
      },
    });
    rerender();
    expect(result.current.sourceBalance).toBeNull();
    expect(result.current.sourceGasBalance).toBeNull();
    expect(result.current.destinationBalance).toEqual(BigNumber.from(300_000));
  });

  it('uses the parent ERC-20 and child native balance for a custom gas token deposit', () => {
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.RobinhoodChain),
        sourceChainProvider: getProviderForChainId(ChainId.RobinhoodChain),
        destinationChain: getWagmiChain(ChainId.ApeChain),
        destinationChainProvider: getProviderForChainId(ChainId.ApeChain),
      },
      vi.fn(),
    ]);
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      address: CommonAddress.RobinhoodChain.APE,
      isCustom: true,
    });
    vi.mocked(useTokenBalances).mockImplementation(({ chainId, tokenAddresses }) => ({
      data: Object.fromEntries(
        tokenAddresses.map((tokenAddress) => [
          tokenAddress,
          chainId === ChainId.ApeChain
            ? 300_000n
            : tokenAddress === zeroAddress
              ? 100_000n
              : 500_000n,
        ]),
      ),
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }));

    const { result } = renderHook(useNativeCurrencyBalances);

    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(500_000),
      sourceGasBalance: BigNumber.from(100_000),
      destinationBalance: BigNumber.from(300_000),
      destinationGasBalance: BigNumber.from(300_000),
    });
  });

  it('keeps the received custom token separate from destination gas on withdrawal', () => {
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ApeChain),
        sourceChainProvider: getProviderForChainId(ChainId.ApeChain),
        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      address: CommonAddress.ArbitrumOne.APE,
      isCustom: true,
    });
    vi.mocked(useTokenBalances).mockImplementation(({ chainId, tokenAddresses }) => ({
      data: Object.fromEntries(
        tokenAddresses.map((tokenAddress) => [
          tokenAddress,
          chainId === ChainId.ApeChain
            ? 500_000n
            : tokenAddress === zeroAddress
              ? 100_000n
              : 300_000n,
        ]),
      ),
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }));

    const { result } = renderHook(useNativeCurrencyBalances);

    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(500_000),
      sourceGasBalance: BigNumber.from(500_000),
      destinationBalance: BigNumber.from(300_000),
      destinationGasBalance: BigNumber.from(100_000),
    });
  });
});

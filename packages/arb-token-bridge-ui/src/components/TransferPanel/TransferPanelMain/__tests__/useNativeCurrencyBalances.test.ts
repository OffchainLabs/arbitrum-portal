import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNativeCurrency } from '../../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../../hooks/useNetworks';
import { createBalanceTestWrapper } from '../../../../test-utils/balance-test-wrapper';
import { ChainId } from '../../../../types/ChainId';
import { CommonAddress } from '../../../../util/CommonAddressUtils';
import { getChainMetadata } from '../../../../util/networkMetadata';
import { defaultWalletContextValue } from '../../../../wallet/WalletContext';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../../../wallet/constants';
import type { BalanceClient, WalletContextValue } from '../../../../wallet/types';
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances';

vi.mock('../../../../hooks/useNetworks', () => ({ useNetworks: vi.fn() }));
vi.mock('../../../../hooks/useNativeCurrency', () => ({ useNativeCurrency: vi.fn() }));
const query = vi.hoisted((): { destinationAddress?: string } => ({}));
vi.mock('../../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [query],
}));
afterEach(cleanup);
let wallets: WalletContextValue;
let fetchBalance: BalanceClient['fetchBalance'];
let wrapper: ReturnType<typeof createBalanceTestWrapper>;

const sourceAddress = '0x1111111111111111111111111111111111111111';

describe.sequential('useNativeCurrencyBalances', () => {
  beforeEach(() => {
    wrapper = createBalanceTestWrapper(
      () => wallets,
      (input) => fetchBalance(input),
    );
    query.destinationAddress = undefined;
    vi.mocked(useNativeCurrency).mockReturnValue({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      isCustom: false,
    });
    wallets = {
      ...defaultWalletContextValue,
      evm: {
        ...defaultWalletContextValue.evm,
        account: {
          ecosystem: 'evm',
          address: sourceAddress,
          chainId: ChainId.Sepolia,
          status: 'connected',
        },
        isConnected: true,
      },
    };
  });

  it('uses the custom recipient for holdings and the connected payer for destination gas', async () => {
    const recipient = '0x3333333333333333333333333333333333333333';
    query.destinationAddress = recipient;
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getChainMetadata(ChainId.Sepolia),
        destinationChain: getChainMetadata(ChainId.ArbitrumSepolia),
      },
      vi.fn(),
    ]);
    fetchBalance = async ({ walletAddress }) => ({
      [zeroAddress]: walletAddress === recipient ? 900n : 100n,
    });
    const { result } = renderHook(useNativeCurrencyBalances, { wrapper });
    await waitFor(() => expect(result.current.destinationBalance).toEqual(BigNumber.from(900)));
    expect(result.current.destinationGasBalance).toEqual(BigNumber.from(100));
  });

  it('selects the source and destination wallets independently', async () => {
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getChainMetadata(ChainId.Solana),
        destinationChain: getChainMetadata(ChainId.ArbitrumOne),
      },
      vi.fn(),
    ]);
    wallets = {
      ...wallets,
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
    fetchBalance = async ({ chainId }) => ({
      [chainId === ChainId.Solana ? SOLANA_NATIVE_TOKEN_ADDRESS : zeroAddress]:
        chainId === ChainId.Solana ? 100_000n : 300_000n,
    });

    const { result, rerender } = renderHook(useNativeCurrencyBalances, { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({
        sourceBalance: BigNumber.from(100_000),
        sourceGasBalance: BigNumber.from(100_000),
        destinationBalance: BigNumber.from(300_000),
        destinationGasBalance: BigNumber.from(300_000),
      }),
    );

    wallets = { ...wallets, solana: defaultWalletContextValue.solana };
    rerender();
    expect(result.current.sourceBalance).toBeNull();
    expect(result.current.sourceGasBalance).toBeNull();
    expect(result.current.destinationBalance).toEqual(BigNumber.from(300_000));
  });

  it('uses the parent ERC-20 and child native balance for a custom gas token deposit', async () => {
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getChainMetadata(ChainId.RobinhoodChain),
        destinationChain: getChainMetadata(ChainId.ApeChain),
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
    fetchBalance = async ({ chainId, tokenAddresses }) =>
      Object.fromEntries(
        tokenAddresses.map((tokenAddress) => [
          tokenAddress,
          chainId === ChainId.ApeChain
            ? 300_000n
            : tokenAddress === zeroAddress
              ? 100_000n
              : 500_000n,
        ]),
      );

    const { result } = renderHook(useNativeCurrencyBalances, { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({
        sourceBalance: BigNumber.from(500_000),
        sourceGasBalance: BigNumber.from(100_000),
        destinationBalance: BigNumber.from(300_000),
        destinationGasBalance: BigNumber.from(300_000),
      }),
    );
  });

  it('keeps the received custom token separate from destination gas on withdrawal', async () => {
    vi.mocked(useNetworks).mockReturnValue([
      {
        sourceChain: getChainMetadata(ChainId.ApeChain),
        destinationChain: getChainMetadata(ChainId.ArbitrumOne),
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
    fetchBalance = async ({ chainId, tokenAddresses }) =>
      Object.fromEntries(
        tokenAddresses.map((tokenAddress) => [
          tokenAddress,
          chainId === ChainId.ApeChain
            ? 500_000n
            : tokenAddress === zeroAddress
              ? 100_000n
              : 300_000n,
        ]),
      );

    const { result } = renderHook(useNativeCurrencyBalances, { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual({
        sourceBalance: BigNumber.from(500_000),
        sourceGasBalance: BigNumber.from(500_000),
        destinationBalance: BigNumber.from(300_000),
        destinationGasBalance: BigNumber.from(100_000),
      }),
    );
  });
});

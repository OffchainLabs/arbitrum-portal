import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { zeroAddress } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../../../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../../../types/ChainId';
import { CommonAddress } from '../../../../util/CommonAddressUtils';
import { defaultWalletContextValue } from '../../../../wallet/WalletContext';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../../../wallet/constants';
import type { WalletContextValue } from '../../../../wallet/types';
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances';

vi.mock('../../../../util/featureFlag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));
afterEach(cleanup);

const sourceAddress = '0x1111111111111111111111111111111111111111';
const connectedWallets: WalletContextValue = {
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

describe.sequential('useNativeCurrencyBalances', () => {
  it('uses the custom recipient for holdings and the connected payer for destination gas', async () => {
    const recipient = '0x3333333333333333333333333333333333333333';
    const query = {
      sourceChain: ChainId.Sepolia,
      destinationChain: ChainId.ArbitrumSepolia,
      destinationAddress: recipient,
    };
    const wrapper = createBridgeTestWrapper({
      wallets: connectedWallets,
      fetchBalance: async ({ walletAddress }) => ({
        [zeroAddress]: walletAddress === recipient ? 900n : 100n,
      }),
      query,
    });
    const { result } = renderHook(useNativeCurrencyBalances, { wrapper });
    await waitFor(() => expect(result.current.destinationBalance).toEqual(BigNumber.from(900)));
    expect(result.current.destinationGasBalance).toEqual(BigNumber.from(100));
  });

  it('selects source and destination wallets independently', async () => {
    const wallets: WalletContextValue = {
      ...connectedWallets,
      solana: {
        ...defaultWalletContextValue.solana,
        isConnected: true,
        account: {
          ecosystem: 'solana',
          address: 'So11111111111111111111111111111111111111112',
          chainId: ChainId.Solana,
          status: 'connected',
        },
      },
    };
    const wrapper = createBridgeTestWrapper({
      query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
      wallets,
      fetchBalance: async ({ chainId }) => ({
        [chainId === ChainId.Solana ? SOLANA_NATIVE_TOKEN_ADDRESS : zeroAddress]:
          chainId === ChainId.Solana ? 100_000n : 300_000n,
      }),
    });
    const { result } = renderHook(useNativeCurrencyBalances, { wrapper });
    await waitFor(() =>
      expect(result.current).toEqual({
        sourceBalance: BigNumber.from(100_000),
        sourceGasBalance: BigNumber.from(100_000),
        destinationBalance: BigNumber.from(300_000),
        destinationGasBalance: BigNumber.from(300_000),
      }),
    );
  });

  it('uses the parent ERC-20 and child native balance for a custom gas token deposit', async () => {
    const query = { sourceChain: ChainId.RobinhoodChain, destinationChain: ChainId.ApeChain };
    const currency = {
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      address: CommonAddress.RobinhoodChain.APE,
      isCustom: true as const,
    };
    const wrapper = createBridgeTestWrapper({
      wallets: connectedWallets,
      fetchBalance: async ({ chainId, tokenAddresses }) =>
        Object.fromEntries(
          tokenAddresses.map((tokenAddress) => [
            tokenAddress,
            chainId === ChainId.ApeChain
              ? 300_000n
              : tokenAddress === zeroAddress
                ? 100_000n
                : 500_000n,
          ]),
        ),
      query,
      nativeCurrencies: { [query.sourceChain]: currency, [query.destinationChain]: currency },
    });

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
    const query = { sourceChain: ChainId.ApeChain, destinationChain: ChainId.ArbitrumOne };
    const currency = {
      name: 'ApeCoin',
      symbol: 'APE',
      decimals: 18,
      address: CommonAddress.ArbitrumOne.APE,
      isCustom: true as const,
    };
    const wrapper = createBridgeTestWrapper({
      wallets: connectedWallets,
      fetchBalance: async ({ chainId, tokenAddresses }) =>
        Object.fromEntries(
          tokenAddresses.map((tokenAddress) => [
            tokenAddress,
            chainId === ChainId.ApeChain
              ? 500_000n
              : tokenAddress === zeroAddress
                ? 100_000n
                : 300_000n,
          ]),
        ),
      query,
      nativeCurrencies: { [query.sourceChain]: currency, [query.destinationChain]: currency },
    });

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

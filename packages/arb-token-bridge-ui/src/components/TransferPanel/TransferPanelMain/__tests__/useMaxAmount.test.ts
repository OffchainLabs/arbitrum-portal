import { renderHook, waitFor } from '@testing-library/react';
import { constants, utils } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../../../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../../../types/ChainId';
import type { SolanaAddress } from '../../../../util/AddressUtils';
import { NOVA_MAX_ETH_DEPOSIT_AMOUNT } from '../../../../util/NovaUtils';
import { defaultWalletContextValue } from '../../../../wallet/WalletContext';
import { isLifiOnlyChain } from '../../../../wallet/ecosystems';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../../../wallet/ecosystems/solana';
import { useMaxAmount } from '../useMaxAmount';

vi.mock('../../../../token-bridge-sdk/utils', async (actual) => ({
  ...(await actual<typeof import('../../../../token-bridge-sdk/utils')>()),
  getProviderForChainId: (chainId: number) => ({
    getNetwork: async () => ({ chainId }),
    getGasPrice: async () => constants.Zero,
    getSigner: (address: string) => ({ getAddress: async () => address }),
  }),
}));
vi.mock('../../../../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});
vi.mock('../../../../token-bridge-sdk/BridgeTransferStarterFactory', () => ({
  BridgeTransferStarterFactory: {
    create: ({
      sourceChainId,
      destinationChainId,
    }: {
      sourceChainId: number;
      destinationChainId: number;
    }) => {
      if (isLifiOnlyChain(sourceChainId) || isLifiOnlyChain(destinationChainId)) {
        throw new Error('A LiFi quote is required to transfer between these chains.');
      }
      return {
        transferEstimateGas: async () => ({
          estimatedParentChainGas: constants.Zero,
          estimatedChildChainGas: constants.Zero,
          estimatedChildChainSubmissionCost: constants.Zero,
        }),
      };
    },
  },
}));

describe.sequential('useMaxAmount', () => {
  it.each([
    {
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumNova,
      balance: '1',
      expected: NOVA_MAX_ETH_DEPOSIT_AMOUNT,
    },
    {
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumNova,
      balance: '0.001',
      expected: 0.001,
    },
    {
      sourceChain: ChainId.ArbitrumNova,
      destinationChain: ChainId.Ethereum,
      balance: '1',
      expected: 1,
    },
    {
      sourceChain: ChainId.ArbitrumNova,
      destinationChain: ChainId.ArbitrumOne,
      balance: '1',
      expected: 1,
    },
    {
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumOne,
      balance: '1',
      expected: 1,
    },
    // Before a route is quoted, MAX leaves a gas buffer of 0.001 of the native currency
    {
      sourceChain: ChainId.Elysium,
      destinationChain: ChainId.ArbitrumOne,
      balance: '1',
      expected: 0.999,
    },
    {
      sourceChain: ChainId.Base,
      destinationChain: ChainId.Elysium,
      balance: '1',
      expected: 0.999,
    },
  ])(
    'limits $sourceChain to $destinationChain with balance $balance to $expected',
    async ({ sourceChain, destinationChain, balance, expected }) => {
      const address = '0x1111111111111111111111111111111111111111';
      const wrapper = createBridgeTestWrapper({
        query: { sourceChain, destinationChain },
        wallets: {
          ...defaultWalletContextValue,
          evm: {
            ...defaultWalletContextValue.evm,
            isConnected: true,
            account: { ecosystem: 'evm', address, chainId: sourceChain, status: 'connected' },
          },
        },
        fetchBalance: async () => ({
          [constants.AddressZero]: BigInt(utils.parseEther(balance).toString()),
        }),
      });
      const { result } = renderHook(useMaxAmount, { wrapper });
      await waitFor(() => expect(Number(result.current.maxAmount)).toBe(expected));
    },
  );

  it.each([
    { balance: '98520000', expected: '0.09552' },
    // Below the reserve and gas buffer, MAX fills the balance to show the insufficient gas error
    { balance: '2500000', expected: '0.0025' },
  ])(
    'keeps the SOL reserve and a gas buffer before a route is quoted, with balance $balance',
    async ({ balance, expected }) => {
      const address = 'So11111111111111111111111111111111111111112' as SolanaAddress;
      const wrapper = createBridgeTestWrapper({
        query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
        wallets: {
          ...defaultWalletContextValue,
          solana: {
            ...defaultWalletContextValue.solana,
            isConnected: true,
            account: {
              ecosystem: 'solana',
              address,
              chainId: ChainId.Solana,
              status: 'connected',
            },
          },
        },
        fetchBalance: async () => ({ [SOLANA_NATIVE_TOKEN_ADDRESS]: BigInt(balance) }),
      });
      const { result } = renderHook(useMaxAmount, { wrapper });
      await waitFor(() => expect(result.current.maxAmount).toBe(expected));
    },
  );
});

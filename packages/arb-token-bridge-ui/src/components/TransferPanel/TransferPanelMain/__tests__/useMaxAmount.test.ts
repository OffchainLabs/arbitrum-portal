import { renderHook, waitFor } from '@testing-library/react';
import { constants, utils } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../../../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../../../types/ChainId';
import { NOVA_MAX_ETH_DEPOSIT_AMOUNT } from '../../../../util/NovaUtils';
import { defaultWalletContextValue } from '../../../../wallet/WalletContext';
import { useMaxAmount } from '../useMaxAmount';

vi.mock('../../../../token-bridge-sdk/utils', async (actual) => ({
  ...(await actual<typeof import('../../../../token-bridge-sdk/utils')>()),
  getProviderForChainId: (chainId: number) => ({
    getNetwork: async () => ({ chainId }),
    getGasPrice: async () => constants.Zero,
    getSigner: (address: string) => ({ getAddress: async () => address }),
  }),
}));
vi.mock('../../../../token-bridge-sdk/BridgeTransferStarterFactory', () => ({
  BridgeTransferStarterFactory: {
    create: () => ({
      transferEstimateGas: async () => ({
        estimatedParentChainGas: constants.Zero,
        estimatedChildChainGas: constants.Zero,
        estimatedChildChainSubmissionCost: constants.Zero,
      }),
    }),
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
});

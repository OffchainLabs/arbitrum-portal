import { getStepTransaction } from '@lifi/sdk';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { switchChain } from '@wagmi/core';
import { BigNumber, constants } from 'ethers';
import React, { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  solanaNativeTokenAddress,
  solanaUsdcTokenAddress,
  solanaUsdtTokenAddress,
} from '../../app/api/crosschain-transfers/utils';
import { useLifiCrossTransfersRoute } from '../../hooks/useLifiCrossTransferRoute';
import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { createNetworksState } from '../../wallet/hooks/__tests__/utils';
import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { BalanceContext } from '../../wallet/providers/BalanceProvider';
import { WalletContext } from '../../wallet/providers/WalletProvider';
import type {
  EvmBalanceHandle,
  EvmWalletHandle,
  SolanaBalanceHandle,
  SolanaWalletHandle,
} from '../../wallet/types';
import { SolanaPocTransferPanel } from './SolanaPocTransferPanel';

vi.mock('@lifi/sdk', () => ({
  getStepTransaction: vi.fn(),
}));

vi.mock('@wagmi/core', () => ({
  switchChain: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useConfig: () => ({ state: {} }),
}));

vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../../wallet/hooks/useWalletModal', () => ({
  useWalletModal: vi.fn(),
}));

vi.mock('../../hooks/useLifiCrossTransferRoute', () => ({
  useLifiCrossTransfersRoute: vi.fn(),
}));

const solanaWallet: SolanaWalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
    chain: { id: ChainId.Solana },
    status: 'connected',
    walletInfo: {
      name: 'Phantom',
    },
  },
  isConnected: true,
  disconnect: async () => {},
  sendTransaction: async () => ({ hash: 'solana-hash' }),
};

const evmWallet: EvmWalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33',
    chain: { id: ChainId.ArbitrumOne },
    status: 'connected',
    walletInfo: {
      name: 'MetaMask',
    },
  },
  isConnected: true,
  disconnect: async () => {},
  sendTransaction: async () => ({ hash: '0xhash' }),
};

const route = {
  protocolData: {
    orders: ['CHEAPEST'],
    tool: {
      key: 'gasZipBridge',
      name: 'GasZip',
      logoURI: 'https://example.com/gaszip.svg',
    },
    step: {
      id: 'step-1',
    },
  },
  toAmount: {
    amount: '100000000000000000',
  },
} as const;

type LifiRouteResult = ReturnType<typeof useLifiCrossTransfersRoute>;
type GetStepTransactionResult = Awaited<ReturnType<typeof getStepTransaction>>;

function getLastElement<T>(values: T[]): T {
  const value = values.at(-1);

  if (value === undefined) {
    throw new Error('Expected at least one element.');
  }

  return value;
}

function mockUseNetworksState({
  sourceChainId,
  destinationChainId,
  sourceChainName,
  destinationChainName,
}: {
  sourceChainId: ChainId;
  destinationChainId: ChainId;
  sourceChainName: string;
  destinationChainName: string;
}) {
  let currentNetworks = createNetworksState({
    sourceChainId,
    destinationChainId,
    sourceChainName,
    destinationChainName,
  });

  const setNetworks = vi.fn(
    ({ sourceChainId: nextSourceChainId, destinationChainId: nextDestinationChainId }) => {
      currentNetworks = createNetworksState({
        sourceChainId: nextSourceChainId,
        destinationChainId: nextDestinationChainId,
        sourceChainName: nextSourceChainId === ChainId.Solana ? 'Solana' : 'Ethereum',
        destinationChainName: nextDestinationChainId === ChainId.Solana ? 'Solana' : 'Arbitrum One',
      });
    },
  );

  vi.mocked(useNetworks).mockImplementation(() => [currentNetworks, setNetworks]);

  return { setNetworks };
}

function createWrapper({
  evmWalletValue = evmWallet,
  solanaWalletValue = solanaWallet,
  evmBalance,
  solanaBalance,
}: {
  evmWalletValue?: EvmWalletHandle;
  solanaWalletValue?: SolanaWalletHandle;
  evmBalance: EvmBalanceHandle;
  solanaBalance: SolanaBalanceHandle;
}) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <WalletContext.Provider value={{ evm: evmWalletValue, solana: solanaWalletValue }}>
          <BalanceContext.Provider value={{ evm: evmBalance, solana: solanaBalance }}>
            {children}
          </BalanceContext.Provider>
        </WalletContext.Provider>
      </SWRConfig>
    );
  };
}

function renderArbitrumToSolana({
  evmWalletValue = evmWallet,
}: {
  evmWalletValue?: EvmWalletHandle;
} = {}) {
  mockUseNetworksState({
    sourceChainId: ChainId.ArbitrumOne,
    destinationChainId: ChainId.Solana,
    sourceChainName: 'Arbitrum One',
    destinationChainName: 'Solana',
  });
  vi.mocked(useWalletModal).mockReturnValue({ openConnectModal: vi.fn() });

  render(<SolanaPocTransferPanel initialPresetId="arbitrum-to-solana" />, {
    wrapper: createWrapper({
      evmBalance: { ecosystem: 'evm', fetchBalance: vi.fn().mockResolvedValue({}) },
      solanaBalance: { ecosystem: 'solana', fetchBalance: vi.fn().mockResolvedValue({}) },
      evmWalletValue,
    }),
  });
}

describe('SolanaPocTransferPanel', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the default Solana -> EVM flow and executes through the Solana signer', async () => {
    const waitForTransaction = vi.fn().mockResolvedValue(undefined);
    const sendTransaction = vi.fn().mockResolvedValue({
      hash: 'solana-hash',
      wait: waitForTransaction,
    });
    const solanaFetchBalance = vi.fn().mockResolvedValue({
      [solanaNativeTokenAddress]: BigNumber.from('1250000000'),
    });
    const evmFetchBalance = vi.fn().mockResolvedValue({
      [constants.AddressZero]: BigNumber.from('500000000000000000'),
      [CommonAddress.ArbitrumOne.USDC]: BigNumber.from('11000000'),
      [CommonAddress.ArbitrumOne.USDT]: BigNumber.from('9500000'),
    });

    mockUseNetworksState({
      sourceChainId: ChainId.Solana,
      destinationChainId: ChainId.ArbitrumOne,
      sourceChainName: 'Solana',
      destinationChainName: 'Arbitrum One',
    });
    vi.mocked(useWalletModal).mockReturnValue({
      openConnectModal: vi.fn(),
    });
    vi.mocked(useLifiCrossTransfersRoute).mockReturnValue({
      data: [route],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
      isValidating: false,
    } as unknown as LifiRouteResult);
    vi.mocked(getStepTransaction).mockResolvedValue({
      transactionRequest: {
        data: 'serialized-solana-transaction',
      },
    } as GetStepTransactionResult);

    render(<SolanaPocTransferPanel />, {
      wrapper: createWrapper({
        evmBalance: {
          ecosystem: 'evm',
          fetchBalance: evmFetchBalance,
        },
        solanaBalance: {
          ecosystem: 'solana',
          fetchBalance: solanaFetchBalance,
        },
        solanaWalletValue: {
          ...solanaWallet,
          sendTransaction,
        },
      }),
    });

    expect(screen.getByText('Solana -> EVM')).toBeTruthy();
    expect(screen.getByText('EVM -> Solana')).toBeTruthy();
    expect(screen.getByText('EVM -> EVM')).toBeTruthy();
    expect(screen.getByDisplayValue(evmWallet.account.address as string)).toBeTruthy();

    fireEvent.change(getLastElement(screen.getAllByPlaceholderText('0.01')), {
      target: { value: '0.25' },
    });
    fireEvent.click(getLastElement(screen.getAllByTestId('solana-poc-execute-transfer')));

    await waitFor(() => {
      expect(getStepTransaction).toHaveBeenCalledWith(route.protocolData.step);
      expect(sendTransaction).toHaveBeenCalledWith({
        ecosystem: 'solana',
        serializedTransaction: 'serialized-solana-transaction',
      });
      expect(solanaFetchBalance).toHaveBeenCalledWith({
        chainId: ChainId.Solana,
        walletAddress: solanaWallet.account.address,
        tokenAddresses: [solanaNativeTokenAddress, solanaUsdcTokenAddress, solanaUsdtTokenAddress],
      });
      expect(evmFetchBalance).toHaveBeenCalledWith({
        chainId: ChainId.ArbitrumOne,
        walletAddress: evmWallet.account.address,
        tokenAddresses: [
          constants.AddressZero,
          CommonAddress.ArbitrumOne.USDC,
          CommonAddress.ArbitrumOne.USDT,
        ],
      });
      expect(waitForTransaction).toHaveBeenCalledOnce();
      expect(screen.getByText('Last transaction: solana-hash')).toBeTruthy();
    });
  });

  it('switches to Arbitrum One before executing EVM -> Solana', async () => {
    const sendTransaction = vi.fn().mockImplementation(async () => {
      expect(switchChain).toHaveBeenCalledWith(expect.anything(), {
        chainId: ChainId.ArbitrumOne,
      });

      return { hash: '0xhash' };
    });

    vi.mocked(useLifiCrossTransfersRoute).mockReturnValue({
      data: [route],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
      isValidating: false,
    } as unknown as LifiRouteResult);
    vi.mocked(getStepTransaction).mockResolvedValue({
      transactionRequest: {
        chainId: ChainId.ArbitrumOne,
        to: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
      },
    } as GetStepTransactionResult);

    renderArbitrumToSolana({
      evmWalletValue: {
        ...evmWallet,
        account: { ...evmWallet.account, chain: { id: ChainId.Ethereum } },
        sendTransaction,
      },
    });

    fireEvent.change(getLastElement(screen.getAllByPlaceholderText('0.01')), {
      target: { value: '0.002' },
    });
    fireEvent.click(getLastElement(screen.getAllByTestId('solana-poc-execute-transfer')));

    await waitFor(() => {
      expect(switchChain).toHaveBeenCalledWith(expect.anything(), {
        chainId: ChainId.ArbitrumOne,
      });
      expect(sendTransaction).toHaveBeenCalledWith({
        ecosystem: 'evm',
        txRequest: expect.objectContaining({ chainId: ChainId.ArbitrumOne }),
      });
      expect(screen.getByText('Last transaction: 0xhash')).toBeTruthy();
    });
  });
});

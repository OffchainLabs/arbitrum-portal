import { getStepTransaction } from '@lifi/sdk';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { EvmBalanceContext } from '../../wallet/providers/EvmBalanceProvider';
import {
  EvmSignerContext,
  defaultEvmSignerContextValue,
} from '../../wallet/providers/EvmSignerProvider';
import { EvmWalletContext } from '../../wallet/providers/EvmWalletProvider';
import { SolanaBalanceContext } from '../../wallet/providers/SolanaBalanceProvider';
import {
  SolanaSignerContext,
  defaultSolanaSignerContextValue,
} from '../../wallet/providers/SolanaSignerProvider';
import { SolanaWalletContext } from '../../wallet/providers/SolanaWalletProvider';
import type { BalanceHandle, SignerHandle, WalletHandle } from '../../wallet/types';
import { SolanaPocTransferPanel } from './SolanaPocTransferPanel';

vi.mock('@lifi/sdk', () => ({
  getStepTransaction: vi.fn(),
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

const sourceWallet: WalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
    chain: { id: ChainId.Solana },
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
};

const destinationWallet: WalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: '0x9481eF9e2CA814fc94676dEa3E8c3097B06b3a33',
    chain: { id: ChainId.ArbitrumOne },
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
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

function createWrapper({
  evmWallet = destinationWallet,
  solanaWallet = sourceWallet,
  evmSigner = defaultEvmSignerContextValue,
  solanaSigner = defaultSolanaSignerContextValue,
  evmBalance,
  solanaBalance,
}: {
  evmWallet?: WalletHandle;
  solanaWallet?: WalletHandle;
  evmSigner?: SignerHandle;
  solanaSigner?: SignerHandle;
  evmBalance: BalanceHandle;
  solanaBalance: BalanceHandle;
}) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        <EvmWalletContext.Provider value={evmWallet}>
          <SolanaWalletContext.Provider value={solanaWallet}>
            <EvmSignerContext.Provider value={evmSigner}>
              <SolanaSignerContext.Provider value={solanaSigner}>
                <EvmBalanceContext.Provider value={evmBalance}>
                  <SolanaBalanceContext.Provider value={solanaBalance}>
                    {children}
                  </SolanaBalanceContext.Provider>
                </EvmBalanceContext.Provider>
              </SolanaSignerContext.Provider>
            </EvmSignerContext.Provider>
          </SolanaWalletContext.Provider>
        </EvmWalletContext.Provider>
      </SWRConfig>
    );
  };
}

describe('SolanaPocTransferPanel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows connected wallets and balances, then executes through the injected source signer', async () => {
    const sendTransaction = vi.fn().mockResolvedValue({
      hash: 'solana-hash',
      wait: vi.fn().mockResolvedValue(undefined),
    });
    const solanaFetchBalance = vi.fn().mockResolvedValue({
      [solanaNativeTokenAddress]: BigNumber.from('1250000000'),
      [solanaUsdcTokenAddress]: BigNumber.from('42000000'),
      [solanaUsdtTokenAddress]: BigNumber.from('7500000'),
    });
    const evmFetchBalance = vi.fn().mockResolvedValue({
      [constants.AddressZero]: BigNumber.from('500000000000000000'),
      [CommonAddress.ArbitrumOne.USDC]: BigNumber.from('11000000'),
      [CommonAddress.ArbitrumOne.USDT]: BigNumber.from('9500000'),
    });

    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
        sourceChainName: 'Solana',
        destinationChainName: 'Arbitrum One',
      }),
      vi.fn(),
    ]);
    vi.mocked(useWalletModal).mockReturnValue({
      openConnectModal: vi.fn(),
    });
    vi.mocked(useLifiCrossTransfersRoute).mockReturnValue({
      data: [route],
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
      isValidating: false,
    } as LifiRouteResult);
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
        evmSigner: defaultEvmSignerContextValue,
        solanaSigner: {
          ecosystem: 'solana',
          sendTransaction,
        },
      }),
    });

    expect(screen.getByRole('button', { name: 'Disconnect Source Wallet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disconnect Destination Wallet' })).toBeTruthy();
    expect(screen.getByText('Hgw1pN...APu5')).toBeTruthy();
    expect(screen.getByText('0x9481...3a33')).toBeTruthy();

    await waitFor(() => {
      expect(solanaFetchBalance).toHaveBeenCalledWith({
        chainId: ChainId.Solana,
        walletAddress: sourceWallet.account.address,
        tokenAddresses: [solanaNativeTokenAddress, solanaUsdcTokenAddress, solanaUsdtTokenAddress],
      });
      expect(evmFetchBalance).toHaveBeenCalledWith({
        chainId: ChainId.ArbitrumOne,
        walletAddress: destinationWallet.account.address,
        tokenAddresses: [
          constants.AddressZero,
          CommonAddress.ArbitrumOne.USDC,
          CommonAddress.ArbitrumOne.USDT,
        ],
      });
    });

    expect(await screen.findByText('1.25')).toBeTruthy();
    expect(await screen.findByText('42.0')).toBeTruthy();
    expect(await screen.findByText('7.5')).toBeTruthy();
    expect(await screen.findByText('0.5')).toBeTruthy();
    expect(await screen.findByText('11.0')).toBeTruthy();
    expect(await screen.findByText('9.5')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('0.01'), {
      target: { value: '0.25' },
    });

    expect(screen.getByDisplayValue(destinationWallet.account.address as string)).toBeTruthy();

    fireEvent.click(screen.getByTestId('solana-poc-execute-transfer'));

    await waitFor(() => {
      expect(getStepTransaction).toHaveBeenCalledWith(route.protocolData.step);
      expect(sendTransaction).toHaveBeenCalledWith({
        ecosystem: 'solana',
        serializedTransaction: 'serialized-solana-transaction',
      });
    });

    expect(await screen.findByText('Last transaction: solana-hash')).toBeTruthy();
  });
});

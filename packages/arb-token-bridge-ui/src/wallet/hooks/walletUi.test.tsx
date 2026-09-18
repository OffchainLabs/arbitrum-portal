import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSyncConnectedChainToQueryParams } from '../../components/App/useSyncConnectedChainToQueryParams';
import { NetworkWalletButton } from '../../components/TransferPanel/NetworkWalletButton';
import { createWalletTestWrapper } from '../../test-utils/wallet-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { WalletContext, defaultWalletContextValue } from '../WalletContext';
import type { WalletContextValue } from '../types';
import { useWallets } from './useWallets';

const external = vi.hoisted(() => ({
  open: vi.fn(),
  getCaipNetwork: vi.fn(),
  setCaipNetwork: vi.fn(),
}));
vi.mock('@reown/appkit/react', () => ({ useAppKit: () => ({ open: external.open }) }));
vi.mock('../../util/wagmi/setup', () => ({ appKit: external }));
vi.mock('wagmi', () => ({ useEnsName: () => ({}), useEnsAvatar: () => ({}) }));
vi.mock('@unstoppabledomains/resolution', () => ({
  default: { fromEthersProvider: () => ({ reverse: async () => null }) },
}));
vi.mock('../../token-bridge-sdk/utils', () => ({ getProviderForChainId: vi.fn() }));
vi.mock('../../util/AccountUtils', () => ({
  getAccountType: async () => 'externally-owned-account',
}));

vi.mock('../../util/featureFlag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));

const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const evmAddress = '0x1111111111111111111111111111111111111111';
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
describe.sequential('wallet UI through wallet hooks', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('supports EVM=%s Solana=%s without mixing accounts', (evmConnected, solanaConnected) => {
    const wallets: WalletContextValue = {
      evm: {
        ...defaultWalletContextValue.evm,
        disconnect: vi.fn(async () => {}),
        isConnected: evmConnected,
        account: {
          ecosystem: 'evm',
          status: evmConnected ? 'connected' : 'disconnected',
          address: evmConnected ? evmAddress : undefined,
          chainId: 1,
        },
      },
      solana: {
        ...defaultWalletContextValue.solana,
        disconnect: vi.fn(async () => {}),
        isConnected: solanaConnected,
        account: {
          ecosystem: 'solana',
          status: solanaConnected ? 'connected' : 'disconnected',
          address: solanaConnected ? solanaAddress : undefined,
          chainId: ChainId.Solana,
        },
      },
    };
    render(
      <>
        <NetworkWalletButton chainId={ChainId.Solana} />
        <NetworkWalletButton chainId={42161} />
      </>,
      {
        wrapper: createWalletTestWrapper({
          wallets,
          query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
        }),
      },
    );
    if (solanaConnected) {
      expect(screen.getByTitle(solanaAddress)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Disconnect Solana wallet' }));
      expect(wallets.solana.disconnect).toHaveBeenCalledOnce();
      expect(wallets.evm.disconnect).not.toHaveBeenCalled();
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Connect Solana wallet' }));
      expect(external.open).toHaveBeenCalledWith({ view: 'Connect', namespace: 'solana' });
    }
    if (evmConnected) {
      expect(screen.getByTitle(evmAddress)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Disconnect Arbitrum One wallet' }));
      expect(wallets.evm.disconnect).toHaveBeenCalledOnce();
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Connect Arbitrum One wallet' }));
      expect(external.open).toHaveBeenCalledWith({ view: 'Connect', namespace: 'eip155' });
    }
  });
  it('keeps a selected Solana source when the EVM account or chain changes', () => {
    const wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      solana: {
        ...defaultWalletContextValue.solana,
        isConnected: true,
        account: {
          ecosystem: 'solana',
          status: 'connected',
          address: solanaAddress,
          chainId: ChainId.Solana,
        },
      },
    };
    function Selection() {
      useSyncConnectedChainToQueryParams();
      const { sourceWallet, destinationWallet } = useWallets();
      return (
        <output>
          {sourceWallet.account.address}/{destinationWallet.account.address ?? 'disconnected'}
        </output>
      );
    }
    const ui = (value: WalletContextValue) => (
      <WalletContext.Provider value={value}>
        <Selection />
      </WalletContext.Provider>
    );
    const { rerender } = render(ui(wallets), {
      wrapper: createWalletTestWrapper({
        query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    const connectedWallets: WalletContextValue = {
      ...wallets,
      evm: {
        ...wallets.evm,
        isConnected: true,
        account: {
          ecosystem: 'evm',
          status: 'connected',
          address: evmAddress,
          chainId: ChainId.Base,
        },
      },
    };
    rerender(ui(connectedWallets));
    expect(screen.getByRole('status').textContent).toBe(`${solanaAddress}/${evmAddress}`);
  });
});

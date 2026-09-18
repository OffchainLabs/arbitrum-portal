import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSyncConnectedChainToQueryParams } from '../../components/App/useSyncConnectedChainToQueryParams';
import { NetworkWalletButton } from '../../components/TransferPanel/NetworkWalletButton';
import { ChainId } from '../../types/ChainId';
import { getChainMetadata } from '../../util/networkMetadata';
import { WalletContext, defaultWalletContextValue } from '../WalletContext';
import type { WalletContextValue } from '../types';
import { useWallets } from './useWallets';

const external = vi.hoisted(() => ({
  open: vi.fn(),
  getCaipNetwork: vi.fn(),
  setCaipNetwork: vi.fn(),
  setQuery: vi.fn(),
  sourceChainId: 1151111081099710,
}));
vi.mock('@reown/appkit/react', () => ({ useAppKit: () => ({ open: external.open }) }));
vi.mock('../../util/wagmi/setup', () => ({ appKit: external }));
vi.mock('wagmi', () => ({ useEnsName: () => ({}), useEnsAvatar: () => ({}) }));
vi.mock('@unstoppabledomains/resolution', () => ({
  default: { fromEthersProvider: () => ({ reverse: async () => null }) },
}));
vi.mock('../../token-bridge-sdk/utils', () => ({ getProviderForChainId: vi.fn() }));
vi.mock('../../hooks/useAccountType', () => ({
  useAccountType: () => ({ accountType: 'externally-owned-account' }),
}));
vi.mock('../../hooks/useDisabledFeatures', () => ({
  useDisabledFeatures: () => ({ isFeatureDisabled: () => false }),
}));
vi.mock('../../hooks/useArbQueryParams', () => ({
  DisabledFeatures: {},
  useArbQueryParams: () => [
    { sourceChain: external.sourceChainId, destinationChain: 42161 },
    external.setQuery,
  ],
}));
vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: getChainMetadata(external.sourceChainId),
      destinationChain: getChainMetadata(42161),
    },
  ],
  sanitizeQueryParams: vi.fn(),
}));

const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const evmAddress = '0x1111111111111111111111111111111111111111';
let wallets: WalletContextValue;
function Wrapper({ children }: PropsWithChildren) {
  return <WalletContext.Provider value={wallets}>{children}</WalletContext.Provider>;
}
beforeEach(() => {
  vi.clearAllMocks();
  external.sourceChainId = ChainId.Solana;
  wallets = {
    evm: { ...defaultWalletContextValue.evm, disconnect: vi.fn(async () => {}) },
    solana: { ...defaultWalletContextValue.solana, disconnect: vi.fn(async () => {}) },
  };
});
afterEach(cleanup);
describe.sequential('wallet UI through wallet hooks', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('supports EVM=%s Solana=%s without mixing accounts', (evmConnected, solanaConnected) => {
    wallets.evm = {
      ...wallets.evm,
      isConnected: evmConnected,
      account: {
        ecosystem: 'evm',
        status: evmConnected ? 'connected' : 'disconnected',
        address: evmConnected ? evmAddress : undefined,
        chainId: 1,
      },
    };
    wallets.solana = {
      ...wallets.solana,
      isConnected: solanaConnected,
      account: {
        ecosystem: 'solana',
        status: solanaConnected ? 'connected' : 'disconnected',
        address: solanaConnected ? solanaAddress : undefined,
        chainId: ChainId.Solana,
      },
    };
    render(
      <>
        <NetworkWalletButton chainId={ChainId.Solana} />
        <NetworkWalletButton chainId={42161} />
      </>,
      { wrapper: Wrapper },
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
    wallets.solana = {
      ...wallets.solana,
      isConnected: true,
      account: {
        ecosystem: 'solana',
        status: 'connected',
        address: solanaAddress,
        chainId: ChainId.Solana,
      },
    };
    const { result, rerender } = renderHook(
      () => {
        useSyncConnectedChainToQueryParams();
        return useWallets();
      },
      { wrapper: Wrapper },
    );
    wallets = {
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
    rerender();
    expect(result.current.sourceWallet.account.address).toBe(solanaAddress);
    expect(result.current.destinationWallet.account.address).toBe(evmAddress);
    expect(external.setQuery).not.toHaveBeenCalled();
  });
});

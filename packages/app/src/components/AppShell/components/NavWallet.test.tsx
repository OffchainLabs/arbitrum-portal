// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWalletTestWrapper } from '@/bridge/test-utils/wallet-test-wrapper';
import { ChainId } from '@/bridge/types/ChainId';
import { defaultWalletContextValue } from '@/bridge/wallet/WalletContext';
import type { WalletContextValue } from '@/bridge/wallet/types';

import { NavWallet } from './NavWallet';

vi.mock('next/navigation', () => ({ usePathname: () => '/bridge' }));
vi.mock('next/font/local', () => ({ default: () => ({ style: {} }) }));
const walletModal = vi.hoisted(() => ({ openConnectModal: vi.fn(), openConnectModalFor: vi.fn() }));
vi.mock('@/bridge/wallet/hooks/useWalletModal', () => ({ useWalletModal: () => walletModal }));
vi.mock('wagmi', () => ({ useEnsName: () => ({}), useEnsAvatar: () => ({}) }));
vi.mock('@unstoppabledomains/resolution', () => ({
  default: { fromEthersProvider: () => ({ reverse: async () => null }) },
}));
vi.mock('@/token-bridge-sdk/utils', () => ({ getProviderForChainId: vi.fn() }));
vi.mock('@/bridge/util/featureFlag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/bridge/util/featureFlag')>()),
  isLifiEnabled: () => true,
}));
vi.mock('@/bridge/wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/bridge/wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});
vi.mock('@/bridge/components/common/CustomBoringAvatar', () => ({
  CustomBoringAvatar: () => <span>Wallet avatar</span>,
}));
vi.mock('@/bridge/components/common/SafeImage', () => ({
  SafeImage: () => <span>Wallet image</span>,
}));

const evmAddress = '0x1234567890123456789012345678901234567890';
const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';

function createWallets() {
  const wallets: WalletContextValue = {
    evm: {
      ...defaultWalletContextValue.evm,
      isConnected: true,
      disconnect: vi.fn(async () => {}),
      account: {
        ecosystem: 'evm',
        address: evmAddress,
        chainId: ChainId.ArbitrumOne,
        status: 'connected',
      },
    },
    solana: {
      ...defaultWalletContextValue.solana,
      isConnected: true,
      disconnect: vi.fn(async () => {}),
      account: {
        ecosystem: 'solana',
        address: solanaAddress,
        chainId: ChainId.Solana,
        status: 'connected',
      },
    },
  };
  return wallets;
}

function renderNavWallet(wallets: WalletContextValue, sourceChain: number) {
  render(<NavWallet />, {
    wrapper: createWalletTestWrapper({
      wallets,
      query: { sourceChain, destinationChain: ChainId.ArbitrumOne },
    }),
  });
}

function disconnected(wallets: WalletContextValue, ecosystem: keyof WalletContextValue) {
  return { ...wallets, [ecosystem]: { ...defaultWalletContextValue[ecosystem] } };
}

afterEach(cleanup);
describe.sequential('header wallet menu', () => {
  let open: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.clearAllMocks();
    open = vi.spyOn(window, 'open').mockImplementation(() => null);
  });
  afterEach(() => open.mockRestore());

  it('opens the explorer, disconnects and offers to connect Solana with only EVM connected', () => {
    const wallets = createWallets();
    renderNavWallet(disconnected(wallets, 'solana'), ChainId.Ethereum);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Explorer' }));
    expect(open).toHaveBeenCalledWith(
      'https://arbiscan.io/address/' + evmAddress,
      '_blank',
      'noopener,noreferrer',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Connect Solana wallet' }));
    expect(walletModal.openConnectModalFor).toHaveBeenCalledWith('solana');
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Wallet' }));
    expect(wallets.evm.disconnect).toHaveBeenCalledTimes(1);
  });

  it('shows the Solana wallet and offers to connect EVM with only Solana connected', () => {
    const wallets = createWallets();
    // the source chain doesn't decide which wallet is shown
    renderNavWallet(disconnected(wallets, 'evm'), ChainId.Ethereum);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Explorer' }));
    expect(open).toHaveBeenCalledWith(
      'https://solscan.io/account/' + solanaAddress,
      '_blank',
      'noopener,noreferrer',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Connect EVM wallet' }));
    expect(walletModal.openConnectModalFor).toHaveBeenCalledWith('evm');
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Wallet' }));
    expect(wallets.solana.disconnect).toHaveBeenCalledTimes(1);
  });

  it.each([ChainId.Solana, ChainId.Ethereum])(
    'lists both wallets once both are connected, source %s',
    (sourceChain) => {
      const wallets = createWallets();
      renderNavWallet(wallets, sourceChain);
      fireEvent.click(screen.getByRole('button', { name: /My wallets/ }));
      expect(screen.getByText('EVM')).toBeTruthy();
      expect(screen.getByText('Solana')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /^Connect/ })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Disconnect Solana wallet' }));
      expect(wallets.solana.disconnect).toHaveBeenCalledTimes(1);
      expect(wallets.evm.disconnect).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Disconnect EVM wallet' }));
      expect(wallets.evm.disconnect).toHaveBeenCalledTimes(1);
    },
  );

  it('hides the explorer link when the wallet is on an unsupported network', () => {
    const wallets = disconnected(createWallets(), 'solana');
    renderNavWallet(
      {
        ...wallets,
        evm: { ...wallets.evm, account: { ...wallets.evm.account, chainId: undefined } },
      },
      ChainId.Ethereum,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('button', { name: 'Explorer' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Disconnect Wallet' })).toBeTruthy();
  });

  it('opens the connect modal when no wallet is connected', () => {
    renderNavWallet(defaultWalletContextValue, ChainId.Solana);
    fireEvent.click(screen.getByRole('button', { name: 'Connect Wallet' }));
    expect(walletModal.openConnectModal).toHaveBeenCalledTimes(1);
  });
});

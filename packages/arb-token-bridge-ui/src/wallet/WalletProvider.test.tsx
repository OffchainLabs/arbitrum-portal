import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { act } from '@testing-library/react';
import { cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { useWalletContext } from './WalletContext';
import { WalletProvider } from './WalletProvider';
import { useSolanaWallet } from './solana';

vi.mock('@reown/appkit/react', () => ({
  useAppKitAccount: vi.fn(),
  useDisconnect: vi.fn(),
  useWalletInfo: vi.fn(),
}));

const disconnect = vi.fn();
const walletInfo = { name: 'MetaMask', icon: 'https://example.com/wallet.png' };
const address = '0x1234567890123456789012345678901234567890';
const caipAddress = `eip155:42161:${address}` as const;
const disconnectedAccount: ReturnType<typeof useAppKitAccount> = {
  address: undefined,
  isConnected: false,
  status: 'disconnected',
  allAccounts: [],
  caipAddress: undefined,
};

describe.sequential('WalletProvider', () => {
  beforeEach(() => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address,
      isConnected: true,
      status: 'connected',
      allAccounts: [],
      caipAddress,
    });
    vi.mocked(useWalletInfo).mockReturnValue({ walletInfo });
    vi.mocked(useDisconnect).mockReturnValue({ disconnect });
  });
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('maps the EVM account with the CAIP chain ID and walletInfo', () => {
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    expect(result.current.account).toEqual({
      ecosystem: 'evm',
      address,
      chainId: 42161,
      status: 'connected',
      walletInfo,
    });
    expect(result.current.isConnected).toBe(true);
    expect(useAppKitAccount).toHaveBeenCalledWith({ namespace: 'eip155' });
    expect(useWalletInfo).toHaveBeenCalledWith('eip155');
  });

  it('reacts to the EVM account chain changing', () => {
    const { result, rerender } = renderHook(() => useWalletContext('evm'), {
      wrapper: WalletProvider,
    });
    vi.mocked(useAppKitAccount).mockReturnValue({
      address,
      caipAddress: `eip155:1:${address}`,
      isConnected: true,
      status: 'connected',
      allAccounts: [],
    });
    rerender();
    expect(result.current.account.chainId).toBe(1);
  });

  it.each([`eip155:0:${address}`, `eip155::${address}`, `eip155:abc:${address}`] as const)(
    'leaves the chain ID unset for %s',
    (invalidCaipAddress) => {
      vi.mocked(useAppKitAccount).mockReturnValue({
        address,
        caipAddress: invalidCaipAddress,
        isConnected: true,
        status: 'connected',
        allAccounts: [],
      });
      const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
      expect(result.current.account.chainId).toBeUndefined();
    },
  );

  it('drops an account address that is not an EVM address', () => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address: 'So11111111111111111111111111111111111111112',
      caipAddress,
      isConnected: true,
      status: 'connected',
      allAccounts: [],
    });
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    expect(result.current.account.address).toBeUndefined();
  });

  it('updates the handle when the account disconnects', () => {
    const { result, rerender } = renderHook(() => useWalletContext('evm'), {
      wrapper: WalletProvider,
    });
    vi.mocked(useAppKitAccount).mockReturnValue({ ...disconnectedAccount, status: undefined });
    vi.mocked(useWalletInfo).mockReturnValue({ walletInfo: undefined });
    rerender();
    expect(result.current.account).toEqual({
      ecosystem: 'evm',
      address: undefined,
      chainId: undefined,
      status: 'disconnected',
      walletInfo: undefined,
    });
    expect(result.current.isConnected).toBe(false);
  });

  it.each(['connecting', 'reconnecting'] as const)('preserves %s status', (status) => {
    vi.mocked(useAppKitAccount).mockReturnValue({ ...disconnectedAccount, status });
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    expect(result.current.account.status).toBe(status);
  });

  it('disconnects only the EVM namespace', async () => {
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    await result.current.disconnect();
    expect(disconnect).toHaveBeenCalledExactlyOnceWith({ namespace: 'eip155' });
  });

  it('does not disconnect an absent EVM session', async () => {
    vi.mocked(useAppKitAccount).mockReturnValue(disconnectedAccount);
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    await result.current.disconnect();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('propagates disconnect errors', async () => {
    const error = new Error('Disconnect failed');
    disconnect.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    await expect(result.current.disconnect()).rejects.toBe(error);
  });

  it('supplies a disconnected Solana handle', async () => {
    vi.mocked(useWalletInfo).mockImplementation((namespace) => ({
      walletInfo: namespace === 'solana' ? undefined : walletInfo,
    }));
    vi.mocked(useAppKitAccount).mockImplementation((options) =>
      options?.namespace === 'solana'
        ? disconnectedAccount
        : { address, isConnected: true, status: 'connected', allAccounts: [], caipAddress },
    );
    const { result } = renderHook(() => useWalletContext('solana'), { wrapper: WalletProvider });
    expect(result.current.account).toEqual({
      ecosystem: 'solana',
      address: undefined,
      chainId: ChainId.Solana,
      status: 'disconnected',
      walletInfo: undefined,
    });
    expect(result.current.isConnected).toBe(false);
    await result.current.disconnect();
    expect(disconnect).not.toHaveBeenCalled();
    expect(useAppKitAccount).toHaveBeenCalledWith({ namespace: 'solana' });
  });
});

describe.sequential('WalletProvider with Solana', () => {
  const sessions = { evm: true, solana: true };
  const useBothWallets = () => ({
    evm: useWalletContext('evm'),
    solana: useSolanaWallet(),
  });
  beforeEach(() => {
    sessions.evm = true;
    sessions.solana = true;
    vi.mocked(useAppKitAccount).mockImplementation((options) => {
      const isSolana = options?.namespace === 'solana';
      const isConnected = isSolana ? sessions.solana : sessions.evm;
      if (!isConnected) return disconnectedAccount;
      return isSolana
        ? {
            address: 'So11111111111111111111111111111111111111112',
            isConnected,
            status: 'connected',
            allAccounts: [],
            caipAddress: undefined,
          }
        : { address, isConnected, status: 'connected', allAccounts: [], caipAddress };
    });
    vi.mocked(useWalletInfo).mockReturnValue({ walletInfo });
    vi.mocked(useDisconnect).mockReturnValue({ disconnect });
    disconnect.mockImplementation(async ({ namespace }) => {
      if (namespace === 'solana') sessions.solana = false;
      if (namespace === 'eip155') sessions.evm = false;
    });
  });
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('retains the EVM account chain while Solana is connected', () => {
    const { result } = renderHook(useBothWallets, { wrapper: WalletProvider });
    expect(result.current.evm.account.chainId).toBe(42161);
    expect(result.current.solana.account.chainId).toBe(ChainId.Solana);
    expect(result.current.solana.account.address).toBe(
      'So11111111111111111111111111111111111111112',
    );
    expect(result.current.solana.account.walletInfo).toEqual(walletInfo);
  });

  it.each(['evm', 'solana'] as const)(
    'disconnects %s without changing the other session',
    async (ecosystem) => {
      const { result, rerender } = renderHook(useBothWallets, { wrapper: WalletProvider });
      await result.current[ecosystem].disconnect();
      rerender();
      expect(disconnect).toHaveBeenCalledExactlyOnceWith({
        namespace: ecosystem === 'evm' ? 'eip155' : 'solana',
      });
      expect(result.current[ecosystem].isConnected).toBe(false);
      expect(result.current[ecosystem === 'evm' ? 'solana' : 'evm'].isConnected).toBe(true);
    },
  );

  it.each([false, true])(
    'preserves child state during EVM startup with Solana connected=%s',
    (solanaConnected) => {
      sessions.evm = false;
      sessions.solana = false;
      const { result, rerender } = renderHook(() => ({ ...useBothWallets(), state: useState(0) }), {
        wrapper: WalletProvider,
      });
      act(() => result.current.state[1](7));
      sessions.evm = true;
      sessions.solana = solanaConnected;
      rerender();
      expect(result.current.evm.isConnected).toBe(true);
      expect(result.current.solana.isConnected).toBe(solanaConnected);
      expect(result.current.state[0]).toBe(7);
    },
  );

  it.each(['evm', 'solana'] as const)('reconnects %s independently', (ecosystem) => {
    const { result, rerender } = renderHook(useBothWallets, { wrapper: WalletProvider });
    sessions[ecosystem] = false;
    rerender();
    expect(result.current[ecosystem].isConnected).toBe(false);
    sessions[ecosystem] = true;
    rerender();
    expect(result.current.evm.isConnected).toBe(true);
    expect(result.current.solana.isConnected).toBe(true);
  });
});

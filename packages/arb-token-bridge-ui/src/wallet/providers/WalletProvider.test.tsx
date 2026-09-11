import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWalletContext } from '../WalletContext';
import { WalletProvider } from './WalletProvider';

vi.mock('@reown/appkit/react', () => ({
  useAppKitAccount: vi.fn(),
  useDisconnect: vi.fn(),
  useWalletInfo: vi.fn(),
}));

const disconnect = vi.fn();
const walletInfo = { name: 'MetaMask', icon: 'https://example.com/wallet.png' };
const address = '0x1234567890123456789012345678901234567890';
const caipAddress = `eip155:42161:${address}` as const;

describe.sequential('WalletProvider', () => {
  beforeEach(() => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address,
      isConnected: true,
      status: 'connected',
      allAccounts: [{ address, caipAddress, chainId: 42161, namespace: 'eip155', type: 'eoa' }],
      caipAddress,
    });
    vi.mocked(useWalletInfo).mockReturnValue({ walletInfo });
    vi.mocked(useDisconnect).mockReturnValue({ disconnect });
  });
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('maps the EVM account with direct chainId and walletInfo', () => {
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    expect(result.current.account).toEqual({
      ecosystem: 'evm',
      address,
      chainId: 42161,
      status: 'connected',
      walletInfo,
    });
    expect(result.current.account.walletInfo).toEqual(walletInfo);
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
      caipAddress,
      isConnected: true,
      status: 'connected',
      allAccounts: [{ address, caipAddress, chainId: 1, namespace: 'eip155', type: 'eoa' }],
    });
    rerender();
    expect(result.current.account.chainId).toBe(1);
  });

  it('uses the chain ID from the account matching the active CAIP address', () => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address,
      caipAddress,
      isConnected: true,
      status: 'connected',
      allAccounts: [
        {
          address,
          caipAddress: `eip155:1:${address}`,
          chainId: 1,
          namespace: 'eip155',
          type: 'eoa',
        },
        { address, caipAddress, chainId: '42161', namespace: 'eip155', type: 'eoa' },
      ],
    });
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    expect(result.current.account.chainId).toBe(42161);
  });

  it('leaves the chain ID unset when Reown has no matching account', () => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address,
      caipAddress,
      isConnected: true,
      status: 'connected',
      allAccounts: [
        {
          address,
          caipAddress: `eip155:1:${address}`,
          chainId: 1,
          namespace: 'eip155',
          type: 'eoa',
        },
      ],
    });
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    expect(result.current.account.chainId).toBeUndefined();
  });

  it('updates the handle when the account disconnects', () => {
    const { result, rerender } = renderHook(() => useWalletContext('evm'), {
      wrapper: WalletProvider,
    });
    vi.mocked(useAppKitAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
      status: undefined,
      allAccounts: [],
      caipAddress: undefined,
    });
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
    vi.mocked(useAppKitAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
      status,
      caipAddress: undefined,
      allAccounts: [],
    });
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    expect(result.current.account.status).toBe(status);
  });

  it('disconnects only the EVM namespace', async () => {
    const { result } = renderHook(() => useWalletContext('evm'), { wrapper: WalletProvider });
    await result.current.disconnect();
    expect(disconnect).toHaveBeenCalledExactlyOnceWith({ namespace: 'eip155' });
  });

  it('does not disconnect an absent EVM session', async () => {
    vi.mocked(useAppKitAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
      status: 'disconnected',
      allAccounts: [],
      caipAddress: undefined,
    });
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

  it('supplies a disconnected Solana handle without a transaction sender', async () => {
    const { result } = renderHook(() => useWalletContext('solana'), { wrapper: WalletProvider });
    expect(result.current.account).toEqual({ ecosystem: 'solana', status: 'disconnected' });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.sendTransaction).toBeUndefined();
    await result.current.disconnect();
    expect(disconnect).not.toHaveBeenCalled();
    expect(useAppKitAccount).not.toHaveBeenCalledWith({ namespace: 'solana' });
  });
});

import {
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect,
  useWalletInfo,
} from '@reown/appkit/react';
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { act } from '@testing-library/react';
import { cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWalletContext } from '../WalletContext';
import { WalletProvider } from '../disabled';
import { WalletProvider as SolanaWalletProvider } from '../solana';

const reown = vi.hoisted(() => ({ signAndSendTransaction: vi.fn() }));

vi.mock('@reown/appkit/react', () => ({
  useAppKitProvider: vi.fn(),
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

describe.sequential('WalletProvider with Solana', () => {
  const sessions = { evm: true, solana: true };
  const useBothWallets = () => ({
    evm: useWalletContext('evm'),
    solana: useWalletContext('solana'),
  });
  beforeEach(() => {
    sessions.evm = true;
    sessions.solana = true;
    vi.mocked(useAppKitAccount).mockImplementation((options) => {
      const isSolana = options?.namespace === 'solana';
      const isConnected = isSolana ? sessions.solana : sessions.evm;
      return {
        address: isConnected
          ? isSolana
            ? 'So11111111111111111111111111111111111111112'
            : address
          : undefined,
        isConnected,
        status: isConnected ? 'connected' : 'disconnected',
        allAccounts:
          isSolana || !isConnected
            ? []
            : [
                {
                  address,
                  caipAddress,
                  chainId: 42161,
                  namespace: 'eip155',
                  type: 'eoa',
                },
              ],
        caipAddress: isSolana ? undefined : caipAddress,
      };
    });
    vi.mocked(useAppKitProvider).mockReturnValue({
      walletProvider: { signAndSendTransaction: reown.signAndSendTransaction },
      walletProviderType: undefined,
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
    const { result } = renderHook(useBothWallets, { wrapper: SolanaWalletProvider });
    expect(result.current.evm.account.chainId).toBe(42161);
    expect(result.current.solana.account.chainId).toBe(1151111081099710);
    expect(result.current.solana.sendTransaction).toBeDefined();
    expect(result.current.solana.account.address).toBe(
      'So11111111111111111111111111111111111111112',
    );
    expect(result.current.solana.account.walletInfo).toEqual(walletInfo);
  });

  it.each(['evm', 'solana'] as const)(
    'disconnects %s without changing the other session',
    async (ecosystem) => {
      const { result, rerender } = renderHook(useBothWallets, { wrapper: SolanaWalletProvider });
      await result.current[ecosystem].disconnect();
      rerender();
      expect(disconnect).toHaveBeenCalledExactlyOnceWith({
        namespace: ecosystem === 'evm' ? 'eip155' : 'solana',
      });
      expect(result.current[ecosystem].isConnected).toBe(false);
      expect(result.current[ecosystem === 'evm' ? 'solana' : 'evm'].isConnected).toBe(true);
      if (ecosystem === 'solana') expect(result.current.solana.sendTransaction).toBeUndefined();
    },
  );

  it.each([
    { name: 'disabled', wrapper: WalletProvider },
    { name: 'Solana', wrapper: SolanaWalletProvider },
  ])('preserves child state during $name runtime startup', ({ wrapper }) => {
    sessions.evm = false;
    sessions.solana = false;
    const { result, rerender } = renderHook(() => ({ ...useBothWallets(), state: useState(0) }), {
      wrapper,
    });
    act(() => result.current.state[1](7));
    sessions.evm = true;
    sessions.solana = true;
    rerender();
    expect(result.current.evm.isConnected).toBe(true);
    expect(result.current.state[0]).toBe(7);
  });

  function serializedTransaction() {
    return new VersionedTransaction(
      new TransactionMessage({
        payerKey: new PublicKey('So11111111111111111111111111111111111111112'),
        recentBlockhash: '11111111111111111111111111111111',
        instructions: [],
      }).compileToV0Message(),
    ).serialize();
  }

  it("deserializes bytes and sends through Reown's public provider method", async () => {
    const bytes = serializedTransaction();
    reown.signAndSendTransaction.mockResolvedValue('signature');
    const { result } = renderHook(() => useWalletContext('solana'), {
      wrapper: SolanaWalletProvider,
    });
    await expect(result.current.sendTransaction?.(bytes)).resolves.toBe('signature');
    expect(reown.signAndSendTransaction).toHaveBeenCalledExactlyOnceWith(
      VersionedTransaction.deserialize(bytes),
      { preflightCommitment: 'confirmed' },
    );
  });

  it('propagates wallet rejection', async () => {
    const error = new Error('User rejected transaction');
    reown.signAndSendTransaction.mockRejectedValue(error);
    const { result } = renderHook(() => useWalletContext('solana'), {
      wrapper: SolanaWalletProvider,
    });
    await expect(result.current.sendTransaction?.(serializedTransaction())).rejects.toBe(error);
  });

  it('rejects malformed transactions before calling the wallet', async () => {
    const { result } = renderHook(() => useWalletContext('solana'), {
      wrapper: SolanaWalletProvider,
    });
    await expect(result.current.sendTransaction?.(new Uint8Array())).rejects.toThrow();
    expect(reown.signAndSendTransaction).not.toHaveBeenCalled();
  });

  it.each(['evm', 'solana'] as const)('reconnects %s independently', (ecosystem) => {
    const { result, rerender } = renderHook(useBothWallets, { wrapper: SolanaWalletProvider });
    sessions[ecosystem] = false;
    rerender();
    expect(result.current[ecosystem].isConnected).toBe(false);
    sessions[ecosystem] = true;
    rerender();
    expect(result.current.evm.isConnected).toBe(true);
    expect(result.current.solana.isConnected).toBe(true);
  });

  it('does not expose sending without the public signing method', () => {
    vi.mocked(useAppKitProvider).mockReturnValue({
      walletProvider: {},
      walletProviderType: undefined,
    });
    const { result } = renderHook(() => useWalletContext('solana'), {
      wrapper: SolanaWalletProvider,
    });
    expect(result.current.sendTransaction).toBeUndefined();
  });

  it('does not expose sending without a provider', () => {
    vi.mocked(useAppKitProvider).mockReturnValue({
      walletProvider: undefined,
      walletProviderType: undefined,
    });
    const { result } = renderHook(() => useWalletContext('solana'), {
      wrapper: SolanaWalletProvider,
    });
    expect(result.current.sendTransaction).toBeUndefined();
  });
});

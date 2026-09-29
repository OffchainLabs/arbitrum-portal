import { cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WalletContext, defaultWalletContextValue, useWalletContext } from '../WalletContext';
import type { EvmWalletHandle, SolanaWalletHandle } from '../types';
import { useWalletForChain, useWallets } from './useWallets';

const networks = vi.hoisted(() => ({ sourceChain: { id: 42161 }, destinationChain: { id: 1 } }));
vi.mock('../../hooks/useNetworks', () => ({ useNetworks: () => [networks] }));

const evm: EvmWalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: '0x1234567890123456789012345678901234567890',
    chainId: 42161,
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
};
const solana: SolanaWalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: 'So11111111111111111111111111111111111111112',
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
};
function Wrapper({ children }: PropsWithChildren) {
  return <WalletContext.Provider value={{ evm, solana }}>{children}</WalletContext.Provider>;
}
describe.sequential('useWallets', () => {
  afterEach(() => {
    cleanup();
    networks.sourceChain.id = 42161;
    networks.destinationChain.id = 1;
  });
  it('selects the enabled Solana source independently of the EVM destination', () => {
    networks.sourceChain.id = 1151111081099710;
    const { result } = renderHook(useWallets, { wrapper: Wrapper });
    expect(result.current.sourceWallet).toBe(solana);
    expect(result.current.destinationWallet).toBe(evm);
  });
  it('returns the same injected EVM handle for both sides without Reown providers', () => {
    const { result } = renderHook(() => useWallets(), { wrapper: Wrapper });
    expect(result.current.sourceWallet).toBe(evm);
    expect(result.current.destinationWallet).toBe(evm);
  });
  it('selects a wallet from the requested chain', () => {
    const { result } = renderHook(() => useWalletForChain(1151111081099710), {
      wrapper: Wrapper,
    });
    expect(result.current).toBe(solana);
  });
  it('allows each ecosystem to be injected through the combined context', () => {
    const { result } = renderHook(
      () => ({ evm: useWalletContext('evm'), solana: useWalletContext('solana') }),
      { wrapper: Wrapper },
    );
    expect(result.current.evm).toBe(evm);
    expect(result.current.solana).toBe(solana);
  });
  it('returns disconnected defaults outside a provider', () => {
    const { result } = renderHook(() => useWallets());
    expect(result.current.sourceWallet).toBe(defaultWalletContextValue.evm);
    expect(result.current.destinationWallet).toBe(defaultWalletContextValue.evm);
    expect(result.current.sourceWallet.isConnected).toBe(false);
  });
});

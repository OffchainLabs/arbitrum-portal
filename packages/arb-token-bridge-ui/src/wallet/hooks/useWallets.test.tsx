import { cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  WalletContext,
  defaultWalletContextValue,
  useWalletContext,
} from '../providers/WalletProvider';
import type { EvmWalletHandle, SolanaWalletHandle } from '../types';
import { useWallets } from './useWallets';

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
  afterEach(cleanup);
  it('returns the same injected EVM handle for both sides without Reown providers', () => {
    const { result } = renderHook(() => useWallets(), { wrapper: Wrapper });
    expect(result.current.sourceWallet).toBe(evm);
    expect(result.current.destinationWallet).toBe(evm);
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

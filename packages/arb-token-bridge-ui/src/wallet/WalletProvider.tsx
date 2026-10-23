'use client';

import { type PropsWithChildren, useMemo } from 'react';

import { WalletContext } from './WalletContext';
import { useSolanaWallet } from './solana';
import type { WalletContextValue } from './types';
import { useEvmWallet } from './useEvmWallet';

export function WalletProvider({ children }: PropsWithChildren) {
  const evm = useEvmWallet();
  const solana = useSolanaWallet();
  const value = useMemo<WalletContextValue>(() => ({ evm, solana }), [evm, solana]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

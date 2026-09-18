'use client';

import { type PropsWithChildren, useMemo } from 'react';

import { WalletContext, defaultWalletContextValue } from '../WalletContext';
import { useEvmWallet } from '../useEvmWallet';

export function WalletProvider({ children }: PropsWithChildren) {
  const evm = useEvmWallet();

  const value = useMemo(() => ({ evm, solana: defaultWalletContextValue.solana }), [evm]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

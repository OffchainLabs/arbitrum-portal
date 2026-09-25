'use client';

import { type PropsWithChildren, useMemo } from 'react';

import { WalletContext } from './WalletContext';
import { BalanceProvider } from './balance/BalanceContext';
import { createBalanceService } from './balance/createBalanceService';
import { evmBalanceClient } from './balance/evm';
import { createBalanceClientResolver } from './balance/getBalanceClient';
import { balanceClients, useSolanaWallet } from './solana';
import type { WalletContextValue } from './types';
import { useEvmWallet } from './useEvmWallet';

export const getBalanceClient = createBalanceClientResolver({
  evm: evmBalanceClient,
  ...balanceClients,
});
const balanceService = createBalanceService(getBalanceClient);

export function WalletProvider({ children }: PropsWithChildren) {
  const evm = useEvmWallet();
  const solana = useSolanaWallet();
  const value = useMemo<WalletContextValue>(() => ({ evm, solana }), [evm, solana]);

  return (
    <BalanceProvider service={balanceService}>
      <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
    </BalanceProvider>
  );
}

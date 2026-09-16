'use client';

import type { AppKitNetwork } from '@reown/appkit/networks';
import type { CreateAppKit } from '@reown/appkit/react';
import { type PropsWithChildren, useMemo } from 'react';

import { WalletContext, defaultWalletContextValue } from './WalletContext';
import { BalanceProvider } from './balance/BalanceContext';
import { createBalanceService } from './balance/createBalanceService';
import { evmBalanceClient } from './balance/evm';
import { createBalanceClientResolver } from './balance/getBalanceClient';
import { useEvmWallet } from './useEvmWallet';

export const appKitAdapters: NonNullable<CreateAppKit['adapters']> = [];
export const appKitNetworks: AppKitNetwork[] = [];
export const getBalanceClient = createBalanceClientResolver({ evm: evmBalanceClient });
const balanceService = createBalanceService(getBalanceClient);

export function WalletProvider({ children }: PropsWithChildren) {
  const evm = useEvmWallet();

  const value = useMemo(() => ({ evm, solana: defaultWalletContextValue.solana }), [evm]);

  return (
    <BalanceProvider service={balanceService}>
      <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
    </BalanceProvider>
  );
}

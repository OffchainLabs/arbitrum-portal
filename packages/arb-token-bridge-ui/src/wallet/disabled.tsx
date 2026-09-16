'use client';

import type { AppKitNetwork } from '@reown/appkit/networks';
import type { CreateAppKit } from '@reown/appkit/react';
import { type PropsWithChildren, useMemo } from 'react';

import { WalletContext, defaultWalletContextValue } from './WalletContext';
import { evmBalanceClient } from './balance/evm';
import { createBalanceClientResolver } from './balance/getBalanceClient';
import { useEvmWallet } from './useEvmWallet';

export const appKitAdapters: NonNullable<CreateAppKit['adapters']> = [];
export const appKitNetworks: AppKitNetwork[] = [];
export const getBalanceClient = createBalanceClientResolver({ evm: evmBalanceClient });

export function WalletProvider({ children }: PropsWithChildren) {
  const evm = useEvmWallet();

  const value = useMemo(() => ({ evm, solana: defaultWalletContextValue.solana }), [evm]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

'use client';

import {
  useAppKitAccount,
  useAppKitNetwork,
  useDisconnect,
  useWalletInfo,
} from '@reown/appkit/react';
import { type PropsWithChildren, createContext, useCallback, useContext, useMemo } from 'react';

import type { WalletContextValue, WalletEcosystem } from '../types';

export const defaultWalletContextValue: WalletContextValue = {
  evm: {
    ecosystem: 'evm',
    account: { ecosystem: 'evm', status: 'disconnected' },
    isConnected: false,
    disconnect: async () => {},
  },
  solana: {
    ecosystem: 'solana',
    account: { ecosystem: 'solana', status: 'disconnected' },
    isConnected: false,
    disconnect: async () => {},
  },
};

export const WalletContext = createContext<WalletContextValue>(defaultWalletContextValue);

export function useWalletContext<Ecosystem extends WalletEcosystem>(
  ecosystem: Ecosystem,
): WalletContextValue[Ecosystem] {
  return useContext(WalletContext)[ecosystem];
}

export function WalletProvider({ children }: PropsWithChildren) {
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' });
  const { chainId } = useAppKitNetwork();
  const { walletInfo } = useWalletInfo('eip155');
  const { disconnect } = useDisconnect();

  const disconnectEvm = useCallback(async () => {
    if (isConnected) {
      await disconnect({ namespace: 'eip155' });
    }
  }, [disconnect, isConnected]);

  const value = useMemo<WalletContextValue>(
    () => ({
      evm: {
        ecosystem: 'evm',
        account: {
          ecosystem: 'evm',
          address,
          chainId: typeof chainId === 'number' ? chainId : undefined,
          status: status ?? 'disconnected',
          walletInfo,
        },
        isConnected,
        disconnect: disconnectEvm,
      },
      solana: defaultWalletContextValue.solana,
    }),
    [address, chainId, disconnectEvm, isConnected, status, walletInfo],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { ChainId } from '../../types/ChainId';
import type { WalletAccount, WalletHandle } from '../types';

export const defaultSolanaWalletContextValue: WalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: undefined,
    chain: { id: ChainId.Solana },
    status: 'disconnected',
  },
  isConnected: false,
  disconnect: async () => {},
};

export const SolanaWalletContext = createContext<WalletHandle>(defaultSolanaWalletContextValue);

export function useSolanaWalletContext() {
  return useContext(SolanaWalletContext);
}

export function SolanaWalletProvider({ children }: PropsWithChildren) {
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'solana' });
  const { disconnect } = useDisconnect();

  const account = useMemo<WalletAccount>(() => {
    const walletStatus = status ?? 'disconnected';

    return {
      ecosystem: 'solana',
      address,
      chain: { id: ChainId.Solana },
      status: walletStatus,
    };
  }, [address, status]);

  const handleDisconnect = useCallback(async () => {
    if (!isConnected) {
      return;
    }

    await disconnect({ namespace: 'solana' });
  }, [disconnect, isConnected]);

  const value = useMemo<WalletHandle>(
    () => ({
      ecosystem: 'solana',
      account,
      isConnected,
      disconnect: handleDisconnect,
    }),
    [account, handleDisconnect, isConnected],
  );

  return <SolanaWalletContext.Provider value={value}>{children}</SolanaWalletContext.Provider>;
}

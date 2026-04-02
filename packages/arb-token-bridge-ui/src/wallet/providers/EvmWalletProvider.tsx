import { useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/react';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import type { WalletAccount, WalletHandle } from '../types';

const defaultEvmWalletContextValue: WalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: undefined,
    chain: undefined,
    status: 'disconnected',
  },
  isConnected: false,
  disconnect: async () => {},
};

export const EvmWalletContext = createContext<WalletHandle>(defaultEvmWalletContextValue);

export function useEvmWalletContext() {
  return useContext(EvmWalletContext);
}

export function EvmWalletProvider({ children }: PropsWithChildren) {
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' });
  const { chainId } = useAppKitNetwork();
  const { disconnect } = useDisconnect();

  const account = useMemo<WalletAccount>(() => {
    return {
      ecosystem: 'evm',
      address,
      chain: chainId === undefined ? undefined : { id: chainId as number },
      status: status ?? 'disconnected',
    };
  }, [address, chainId, status]);

  const handleDisconnect = useCallback(async () => {
    if (!isConnected) {
      return;
    }

    await disconnect({ namespace: 'eip155' });
  }, [disconnect, isConnected]);

  const value = useMemo<WalletHandle>(
    () => ({
      ecosystem: 'evm',
      account,
      isConnected,
      disconnect: handleDisconnect,
    }),
    [account, handleDisconnect, isConnected],
  );

  return <EvmWalletContext.Provider value={value}>{children}</EvmWalletContext.Provider>;
}

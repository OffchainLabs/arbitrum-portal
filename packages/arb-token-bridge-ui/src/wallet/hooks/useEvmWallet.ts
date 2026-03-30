import { useAppKitAccount, useAppKitNetwork, useDisconnect } from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';

import { WalletAccount, WalletHandle } from '../types';

export function useEvmWallet(): WalletHandle {
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' });
  const { chainId } = useAppKitNetwork();
  const { disconnect } = useDisconnect();

  const account = useMemo<WalletAccount>(() => {
    const walletStatus = status ?? 'disconnected';

    if (!address || walletStatus === 'disconnected') {
      return {
        ecosystem: 'evm',
        address: undefined,
        chain: undefined,
        status: walletStatus,
      };
    }

    return {
      address,
      chain: chainId === undefined ? undefined : { id: chainId as number },
      ecosystem: 'evm',
      status: walletStatus,
    };
  }, [address, chainId, status]);

  const handleDisconnect = useCallback(async () => {
    if (!isConnected) {
      return;
    }

    await disconnect({ namespace: 'eip155' });
  }, [disconnect, isConnected]);

  return useMemo<WalletHandle>(
    () => ({
      ecosystem: 'evm',
      account,
      isConnected,
      disconnect: handleDisconnect,
    }),
    [account, handleDisconnect, isConnected],
  );
}

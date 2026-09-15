import {
  modal,
  useAppKitAccount,
  useAppKitNetwork,
  useDisconnect,
  useWalletInfo,
} from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';

import type { EvmWalletHandle } from '../types';

export function useEvmWallet(): EvmWalletHandle {
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' });
  // Subscribe to network changes while reading the EVM namespace independently.
  useAppKitNetwork();
  const chainId = modal?.getCaipNetwork('eip155')?.id;
  const { walletInfo } = useWalletInfo('eip155');
  const { disconnect } = useDisconnect();
  const disconnectEvm = useCallback(async () => {
    if (isConnected) await disconnect({ namespace: 'eip155' });
  }, [disconnect, isConnected]);

  return useMemo(
    () => ({
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
    }),
    [address, chainId, status, walletInfo, isConnected, disconnectEvm],
  );
}

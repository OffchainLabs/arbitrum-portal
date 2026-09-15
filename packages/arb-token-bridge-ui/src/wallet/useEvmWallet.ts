import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';
import { isAddress } from 'viem';

import type { EvmWalletHandle } from './types';

export function useEvmWallet(): EvmWalletHandle {
  const { address, caipAddress, isConnected, status } = useAppKitAccount({ namespace: 'eip155' });
  const { walletInfo } = useWalletInfo('eip155');
  const { disconnect } = useDisconnect();

  // CAIP-10 account id: `eip155:<chainId>:<address>`
  const accountChainId = Number(caipAddress?.split(':')[1]);
  const chainId =
    Number.isSafeInteger(accountChainId) && accountChainId > 0 ? accountChainId : undefined;

  const disconnectEvm = useCallback(async () => {
    if (isConnected) {
      await disconnect({ namespace: 'eip155' });
    }
  }, [disconnect, isConnected]);

  return useMemo(
    () => ({
      ecosystem: 'evm',
      account: {
        ecosystem: 'evm',
        address: address && isAddress(address) ? address : undefined,
        chainId,
        status: status ?? 'disconnected',
        walletInfo: walletInfo && { name: walletInfo.name, icon: walletInfo.icon },
      },
      isConnected,
      disconnect: disconnectEvm,
    }),
    [address, chainId, status, walletInfo, isConnected, disconnectEvm],
  );
}

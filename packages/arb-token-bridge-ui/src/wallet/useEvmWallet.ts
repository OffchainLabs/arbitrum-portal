import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';

import type { EvmWalletHandle } from './types';

export function useEvmWallet(): EvmWalletHandle {
  const { address, allAccounts, caipAddress, isConnected, status } = useAppKitAccount({
    namespace: 'eip155',
  });
  const { walletInfo } = useWalletInfo('eip155');
  const { disconnect } = useDisconnect();

  const accountChainId = allAccounts.find(
    (account) => account.caipAddress === caipAddress,
  )?.chainId;
  const numericChainId = Number(accountChainId);
  const chainId = Number.isSafeInteger(numericChainId) ? numericChainId : undefined;

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
        address,
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

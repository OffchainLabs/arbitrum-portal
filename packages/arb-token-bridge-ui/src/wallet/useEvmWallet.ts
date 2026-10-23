import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';
import { isAddress } from 'viem';
import { useAccount } from 'wagmi';

import type { EvmWalletHandle } from './types';

export function useEvmWallet(): EvmWalletHandle {
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' });
  // Undefined when the wallet is on a chain outside the wagmi config
  const chainId = useAccount().chain?.id;
  const { walletInfo } = useWalletInfo('eip155');
  const { disconnect } = useDisconnect();

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

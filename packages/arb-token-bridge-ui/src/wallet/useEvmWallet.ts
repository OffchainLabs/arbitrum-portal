import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { getAccount, getWalletClient } from '@wagmi/core';
import { useCallback, useMemo } from 'react';
import { isAddress } from 'viem';
import { useAccount, useConfig } from 'wagmi';

import type { EvmSigner, EvmWalletHandle } from './types';

export function useEvmWallet(): EvmWalletHandle {
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'eip155' });
  // Undefined when the wallet is on a chain outside the wagmi config
  const chainId = useAccount().chain?.id;
  const { walletInfo } = useWalletInfo('eip155');
  const { disconnect } = useDisconnect();
  const wagmiConfig = useConfig();

  const disconnectEvm = useCallback(async () => {
    if (isConnected) {
      await disconnect({ namespace: 'eip155' });
    }
  }, [disconnect, isConnected]);

  // Reads wagmi's state when LiFi calls it, so a route signs with the account connected at that point
  const signer = useMemo<EvmSigner>(
    () => ({
      getAddress: () => getAccount(wagmiConfig).address,
      getWalletClient: (chainId) => getWalletClient(wagmiConfig, { chainId }),
    }),
    [wagmiConfig],
  );

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
      needsNetworkSigningWarning: (walletInfo?.name ?? '').toLowerCase().includes('trust wallet'),
      disconnect: disconnectEvm,
      signer,
    }),
    [address, chainId, status, walletInfo, isConnected, disconnectEvm, signer],
  );
}

import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { BaseError, getAccount, getConnectorClient, getWalletClient } from '@wagmi/core';
import { useCallback, useMemo } from 'react';
import { isAddress } from 'viem';
import { useAccount, useConfig } from 'wagmi';

import { clientToSigner } from '../util/wagmi/clientToSigner';
import type { EvmSigner, EvmWalletHandle } from './types';

// wagmi's message adds the docs URL and its version, which would show in error toasts
async function withShortWagmiMessage<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof BaseError) {
      throw new Error(error.shortMessage, { cause: error });
    }
    throw error;
  }
}

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

  // Reads wagmi's state when called, so a transfer signs with the account connected at that point
  const signer = useMemo<EvmSigner>(
    () => ({
      getAddress: () => getAccount(wagmiConfig).address,
      getWalletClient: (chainId) =>
        withShortWagmiMessage(() => getWalletClient(wagmiConfig, { chainId })),
      getEthersSigner: (chainId) =>
        withShortWagmiMessage(async () =>
          clientToSigner(await getConnectorClient(wagmiConfig, { chainId })),
        ),
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

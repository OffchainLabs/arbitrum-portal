'use client';

import type { Provider as SolanaWalletProvider } from '@reown/appkit-adapter-solana/react';
import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';

import { ChainId } from '../types/ChainId';
import { appKit } from '../util/wagmi/setup';
import { createSolanaSigner } from './solana/signer';
import type { SolanaWalletHandle } from './types';

// Reads the provider when LiFi calls it, so a route signs with the wallet connected at that point
const signer = createSolanaSigner(() => appKit.getProvider<SolanaWalletProvider>('solana'));

export function useSolanaWallet(): SolanaWalletHandle {
  const { address, status, isConnected } = useAppKitAccount({ namespace: 'solana' });
  const { walletInfo } = useWalletInfo('solana');
  const { disconnect } = useDisconnect();

  const disconnectSolana = useCallback(async () => {
    if (isConnected) await disconnect({ namespace: 'solana' });
  }, [disconnect, isConnected]);

  return useMemo<SolanaWalletHandle>(
    () => ({
      ecosystem: 'solana',
      account: {
        ecosystem: 'solana',
        address,
        chainId: isConnected ? ChainId.Solana : undefined,
        status: status ?? 'disconnected',
        walletInfo: walletInfo && { name: walletInfo.name, icon: walletInfo.icon },
      },
      isConnected,
      needsNetworkSigningWarning: false,
      disconnect: disconnectSolana,
      signer,
    }),
    [address, status, walletInfo, isConnected, disconnectSolana],
  );
}

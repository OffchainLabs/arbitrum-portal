'use client';

import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';
import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';

import { ChainId } from '../types/ChainId';
import { isSolanaEnabled } from '../util/featureFlag';
import type { SolanaWalletHandle } from './types';

export const appKitAdapters = isSolanaEnabled() ? [new SolanaAdapter()] : [];
export const appKitNetworks = isSolanaEnabled() ? [solana] : [];

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
        chainId: ChainId.Solana,
        status: status ?? 'disconnected',
        walletInfo: walletInfo && { name: walletInfo.name, icon: walletInfo.icon },
      },
      isConnected,
      disconnect: disconnectSolana,
    }),
    [address, status, walletInfo, isConnected, disconnectSolana],
  );
}

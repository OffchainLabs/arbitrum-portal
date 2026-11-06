'use client';

import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { useCallback, useMemo } from 'react';

import { ChainId } from '../types/ChainId';
import type { SolanaAddress } from '../util/AddressUtils';
import type { SolanaWalletHandle } from './types';

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
        // AppKit only returns base58 public keys in the solana namespace
        address: address as SolanaAddress | undefined,
        chainId: isConnected ? ChainId.Solana : undefined,
        status: status ?? 'disconnected',
        walletInfo: walletInfo && { name: walletInfo.name, icon: walletInfo.icon },
      },
      isConnected,
      disconnect: disconnectSolana,
    }),
    [address, status, walletInfo, isConnected, disconnectSolana],
  );
}

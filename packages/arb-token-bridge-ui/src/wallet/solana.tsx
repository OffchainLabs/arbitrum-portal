'use client';

import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';
import { useAppKitAccount, useDisconnect, useWalletInfo } from '@reown/appkit/react';
import { Connection } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';

import { ChainId } from '../types/ChainId';
import { isSolanaEnabled } from '../util/featureFlag';
import { createSolanaBalanceClient } from './balance/solana';
import { solanaRpcUrl } from './solana/network';
import type { SolanaWalletHandle } from './types';

export const appKitAdapters = isSolanaEnabled() ? [new SolanaAdapter()] : [];
export const appKitNetworks = isSolanaEnabled() ? [solana] : [];
// AppKit lists custom RPC URLs before Reown's, so the adapter's connection uses ours
export const appKitCustomRpcUrls = isSolanaEnabled()
  ? { [solana.caipNetworkId]: [{ url: solanaRpcUrl }] }
  : undefined;

const connection = new Connection(solanaRpcUrl, 'confirmed');
export const solanaBalanceClient = createSolanaBalanceClient(connection);

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

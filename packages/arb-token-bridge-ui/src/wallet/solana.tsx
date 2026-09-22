'use client';

import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import type { Provider } from '@reown/appkit-utils/solana';
import { solana } from '@reown/appkit/networks';
import {
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect,
  useWalletInfo,
} from '@reown/appkit/react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';

import {
  SolanaTransferStarter,
  type SolanaTransferStarterProps,
} from '../token-bridge-sdk/SolanaTransferStarter';
import { ChainId } from '../types/ChainId';
import type { BalanceClients } from './balance/getBalanceClient';
import { createSolanaBalanceClient } from './solana/fetchBalance';
import type { SolanaWalletHandle } from './types';

export const appKitAdapters = [new SolanaAdapter()];
export const appKitNetworks = [solana];

const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL_SOLANA ?? 'https://solana-rpc.publicnode.com',
  'confirmed',
);
const solanaBalanceClient = createSolanaBalanceClient({
  getBalance: (ownerAddress) => connection.getBalance(ownerAddress, 'confirmed'),
  getParsedTokenAccountsByOwner: (ownerAddress, programId) =>
    connection
      .getParsedTokenAccountsByOwner(ownerAddress, { programId }, 'confirmed')
      .then((response) => response.value),
});

export const balanceClients = { solana: solanaBalanceClient } satisfies BalanceClients;

export function createSolanaTransferStarter(props: SolanaTransferStarterProps) {
  return new SolanaTransferStarter(props);
}

export function useSolanaWallet(): SolanaWalletHandle {
  const { address, status, isConnected } = useAppKitAccount({ namespace: 'solana' });
  const { walletInfo } = useWalletInfo('solana');
  const { walletProvider } = useAppKitProvider<Provider | undefined>('solana');
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
      sendTransaction:
        isConnected && typeof walletProvider?.signAndSendTransaction === 'function'
          ? async (serializedTransaction) =>
              walletProvider.signAndSendTransaction(
                VersionedTransaction.deserialize(serializedTransaction),
                { preflightCommitment: 'confirmed' },
              )
          : undefined,
      confirmTransaction: isConnected
        ? async (signature) => {
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            if (confirmation.value.err) {
              throw new Error(
                `Solana transaction confirmation failed: ${JSON.stringify(confirmation.value.err)}`,
              );
            }
          }
        : undefined,
    }),
    [address, status, walletInfo, isConnected, disconnectSolana, walletProvider],
  );
}

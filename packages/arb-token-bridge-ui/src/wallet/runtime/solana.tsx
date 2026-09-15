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
import { VersionedTransaction } from '@solana/web3.js';
import { type PropsWithChildren, useCallback, useMemo } from 'react';

import { ChainId } from '../../types/ChainId';
import { WalletContext } from '../WalletContext';
import type { WalletContextValue } from '../types';
import { useEvmWallet } from './useEvmWallet';

export const appKitAdapters = [new SolanaAdapter()];
export const appKitNetworks = [solana];

export function WalletProvider({ children }: PropsWithChildren) {
  const evm = useEvmWallet();
  const { address, status, isConnected } = useAppKitAccount({ namespace: 'solana' });
  const { walletInfo } = useWalletInfo('solana');
  const { walletProvider } = useAppKitProvider<Provider | undefined>('solana');
  const { disconnect } = useDisconnect();
  const disconnectSolana = useCallback(async () => {
    if (isConnected) await disconnect({ namespace: 'solana' });
  }, [disconnect, isConnected]);
  const value = useMemo<WalletContextValue>(
    () => ({
      evm,
      solana: {
        ecosystem: 'solana',
        account: {
          ecosystem: 'solana',
          address,
          chainId: ChainId.Solana,
          status: status ?? 'disconnected',
          walletInfo,
        },
        isConnected,
        disconnect: disconnectSolana,
        sendTransaction:
          isConnected && walletProvider
            ? async (serializedTransaction) =>
                walletProvider.signAndSendTransaction(
                  VersionedTransaction.deserialize(serializedTransaction),
                  { preflightCommitment: 'confirmed' },
                )
            : undefined,
      },
    }),
    [evm, address, status, walletInfo, isConnected, disconnectSolana, walletProvider],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

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
import { type PropsWithChildren, useCallback, useMemo } from 'react';

import { ChainId } from '../types/ChainId';
import { WalletContext } from './WalletContext';
import { BalanceProvider } from './balance/BalanceContext';
import { createBalanceService } from './balance/createBalanceService';
import { evmBalanceClient } from './balance/evm';
import { createBalanceClientResolver } from './balance/getBalanceClient';
import { createSolanaBalanceClient } from './solana/fetchBalance';
import type { WalletContextValue } from './types';
import { useEvmWallet } from './useEvmWallet';

export const appKitAdapters = [new SolanaAdapter()];
export const appKitNetworks = [solana];
const solanaBalanceClient = createSolanaBalanceClient(
  (() => {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL_SOLANA ?? 'https://solana-rpc.publicnode.com',
      'confirmed',
    );

    return {
      getBalance: (ownerAddress) => connection.getBalance(ownerAddress, 'confirmed'),
      getParsedTokenAccountsByOwner: (ownerAddress, programId) =>
        connection
          .getParsedTokenAccountsByOwner(ownerAddress, { programId }, 'confirmed')
          .then((response) => response.value),
    };
  })(),
);
export const getBalanceClient = createBalanceClientResolver({
  evm: evmBalanceClient,
  solana: solanaBalanceClient,
});
const balanceService = createBalanceService(getBalanceClient);

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
      },
    }),
    [evm, address, status, walletInfo, isConnected, disconnectSolana, walletProvider],
  );

  return (
    <BalanceProvider service={balanceService}>
      <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
    </BalanceProvider>
  );
}

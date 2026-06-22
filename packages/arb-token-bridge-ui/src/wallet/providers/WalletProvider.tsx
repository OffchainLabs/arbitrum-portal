'use client';

import type { Provider as ReownSolanaProvider } from '@reown/appkit-utils/solana';
import {
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useDisconnect,
  useWalletInfo,
} from '@reown/appkit/react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { sendTransaction as wagmiSendTransaction, waitForTransactionReceipt } from '@wagmi/core';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { Address, Hex } from 'viem';
import { useConfig } from 'wagmi';

import { ChainId } from '../../types/ChainId';
import { solanaRpcUrl } from '../../util/rpc/solana';
import type {
  EvmSendTransactionInput,
  EvmWalletHandle,
  SendTransactionResult,
  SolanaSendTransactionInput,
  SolanaWalletHandle,
  WalletAccount,
  WalletEcosystem,
} from '../types';

const solanaConnection = new Connection(solanaRpcUrl, 'confirmed');

const defaultEvmWallet: EvmWalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    status: 'disconnected',
  },
  isConnected: false,
  disconnect: async () => {},
  sendTransaction: async () => {
    throw new Error('EVM wallet is not connected.');
  },
};

const defaultSolanaWallet: SolanaWalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    chain: { id: ChainId.Solana },
    status: 'disconnected',
  },
  isConnected: false,
  disconnect: async () => {},
  sendTransaction: async () => {
    throw new Error('Solana wallet is not connected.');
  },
};

export type WalletContextValue = {
  evm: EvmWalletHandle;
  solana: SolanaWalletHandle;
};

export const defaultWalletContextValue: WalletContextValue = {
  evm: defaultEvmWallet,
  solana: defaultSolanaWallet,
};

export const WalletContext = createContext<WalletContextValue>(defaultWalletContextValue);

export function useWalletContext<Ecosystem extends WalletEcosystem>(
  ecosystem: Ecosystem,
): WalletContextValue[Ecosystem] {
  return useContext(WalletContext)[ecosystem];
}

function decodeBase64(value: string): Uint8Array {
  const binaryValue = atob(value);
  return Uint8Array.from(binaryValue, (character) => character.charCodeAt(0));
}

export function WalletProvider({ children }: PropsWithChildren) {
  const {
    address: evmAddress,
    isConnected: isEvmConnected,
    status: evmStatus,
  } = useAppKitAccount({ namespace: 'eip155' });
  const {
    address: solanaAddress,
    isConnected: isSolanaConnected,
    status: solanaStatus,
  } = useAppKitAccount({ namespace: 'solana' });
  const { chainId } = useAppKitNetwork();
  const { walletInfo: evmWalletInfo } = useWalletInfo('eip155');
  const { walletInfo: solanaWalletInfo } = useWalletInfo('solana');
  const { walletProvider: solanaWalletProvider } = useAppKitProvider<ReownSolanaProvider>('solana');
  const { disconnect } = useDisconnect();
  const wagmiConfig = useConfig();

  const evmAccount = useMemo<WalletAccount<'evm'>>(
    () => ({
      ecosystem: 'evm',
      address: evmAddress,
      chain: chainId === undefined ? undefined : { id: chainId as number },
      status: evmStatus ?? 'disconnected',
      walletInfo: evmWalletInfo,
    }),
    [chainId, evmAddress, evmStatus, evmWalletInfo],
  );

  const solanaAccount = useMemo<WalletAccount<'solana'>>(
    () => ({
      ecosystem: 'solana',
      address: solanaAddress,
      chain: { id: ChainId.Solana },
      status: solanaStatus ?? 'disconnected',
      walletInfo: solanaWalletInfo,
    }),
    [solanaAddress, solanaStatus, solanaWalletInfo],
  );

  const disconnectEvm = useCallback(async () => {
    if (isEvmConnected) {
      await disconnect({ namespace: 'eip155' });
    }
  }, [disconnect, isEvmConnected]);

  const disconnectSolana = useCallback(async () => {
    if (isSolanaConnected) {
      await disconnect({ namespace: 'solana' });
    }
  }, [disconnect, isSolanaConnected]);

  const sendEvmTransaction = useCallback(
    async (input: EvmSendTransactionInput): Promise<SendTransactionResult> => {
      if (!isEvmConnected) {
        throw new Error('EVM wallet is not connected.');
      }

      const { chainId: transactionChainId, data, gasLimit, gasPrice, to, value } = input.txRequest;
      const hash = await wagmiSendTransaction(wagmiConfig, {
        chainId: transactionChainId,
        data: data as Hex | undefined,
        gas: gasLimit === undefined ? undefined : BigInt(gasLimit.toString()),
        gasPrice: gasPrice === undefined ? undefined : BigInt(gasPrice.toString()),
        to: to as Address,
        value: value === undefined ? undefined : BigInt(value.toString()),
      });

      return {
        hash,
        wait: () => waitForTransactionReceipt(wagmiConfig, { hash }),
      };
    },
    [isEvmConnected, wagmiConfig],
  );

  const sendSolanaTransaction = useCallback(
    async (input: SolanaSendTransactionInput): Promise<SendTransactionResult> => {
      if (!solanaWalletProvider?.signAndSendTransaction) {
        throw new Error('Solana wallet is not connected.');
      }

      const transaction = VersionedTransaction.deserialize(
        decodeBase64(input.serializedTransaction),
      );
      const hash = await solanaWalletProvider.signAndSendTransaction(transaction, {
        preflightCommitment: 'confirmed',
      });

      return {
        hash,
        wait: async () => {
          const result = await solanaConnection.confirmTransaction(hash, 'confirmed');

          if (result.value.err) {
            throw new Error(`Solana transaction failed: ${JSON.stringify(result.value.err)}`);
          }

          return result.value;
        },
      };
    },
    [solanaWalletProvider],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      evm: {
        ecosystem: 'evm',
        account: evmAccount,
        isConnected: isEvmConnected,
        disconnect: disconnectEvm,
        sendTransaction: sendEvmTransaction,
      },
      solana: {
        ecosystem: 'solana',
        account: solanaAccount,
        isConnected: isSolanaConnected,
        disconnect: disconnectSolana,
        sendTransaction: sendSolanaTransaction,
      },
    }),
    [
      disconnectEvm,
      disconnectSolana,
      evmAccount,
      isEvmConnected,
      isSolanaConnected,
      sendEvmTransaction,
      sendSolanaTransaction,
      solanaAccount,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

import type { Provider as ReownSolanaProvider } from '@reown/appkit-utils/solana';
import { useAppKitProvider } from '@reown/appkit/react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { solanaRpcUrl } from '../../util/rpc/solana';
import type { SendTransactionResult, SignerHandle, SolanaSendTransactionInput } from '../types';

export const defaultSolanaSignerContextValue: SignerHandle = {
  ecosystem: 'solana',
  sendTransaction: async () => {
    throw new Error('Solana signer is not connected.');
  },
};

export const SolanaSignerContext = createContext<SignerHandle>(defaultSolanaSignerContextValue);

const solanaConnection = new Connection(solanaRpcUrl, 'confirmed');

export function useSolanaSignerContext() {
  return useContext(SolanaSignerContext);
}

function decodeBase64(value: string): Uint8Array {
  const binaryValue = atob(value);
  return Uint8Array.from(binaryValue, (character) => character.charCodeAt(0));
}

export function SolanaSignerProvider({ children }: PropsWithChildren) {
  const { walletProvider } = useAppKitProvider<ReownSolanaProvider>('solana');

  const sendTransaction = useCallback(
    async (input: SolanaSendTransactionInput): Promise<SendTransactionResult> => {
      if (!walletProvider?.signAndSendTransaction) {
        throw new Error('Solana signer is not connected.');
      }

      const transaction = VersionedTransaction.deserialize(
        decodeBase64(input.serializedTransaction),
      );
      const hash = await walletProvider.signAndSendTransaction(transaction, {
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
    [walletProvider],
  );

  const value = useMemo<SignerHandle>(
    () => ({
      ecosystem: 'solana',
      sendTransaction,
    }),
    [sendTransaction],
  );

  return <SolanaSignerContext.Provider value={value}>{children}</SolanaSignerContext.Provider>;
}

import type { Provider as ReownEvmProvider } from '@reown/appkit-utils/ethers';
import { useAppKitProvider } from '@reown/appkit/react';
import { providers } from 'ethers';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import type { EvmSendTransactionInput, SendTransactionResult, SignerHandle } from '../types';

export const defaultEvmSignerContextValue: SignerHandle = {
  ecosystem: 'evm',
  sendTransaction: async () => {
    throw new Error('EVM signer is not connected.');
  },
};

export const EvmSignerContext = createContext<SignerHandle>(defaultEvmSignerContextValue);

export function useEvmSignerContext() {
  return useContext(EvmSignerContext);
}

export function EvmSignerProvider({ children }: PropsWithChildren) {
  const { walletProvider } = useAppKitProvider<ReownEvmProvider>('eip155');

  const sendTransaction = useCallback(
    async (input: EvmSendTransactionInput): Promise<SendTransactionResult> => {
      if (!walletProvider) {
        throw new Error('EVM signer is not connected.');
      }

      const provider = new providers.Web3Provider(walletProvider);
      const signer = provider.getSigner();
      const tx = await signer.sendTransaction(input.txRequest);

      return {
        hash: tx.hash,
        wait: tx.wait,
      };
    },
    [walletProvider],
  );

  const value = useMemo<SignerHandle>(
    () => ({
      ecosystem: 'evm',
      sendTransaction,
    }),
    [sendTransaction],
  );

  return <EvmSignerContext.Provider value={value}>{children}</EvmSignerContext.Provider>;
}

import { useCallback, useMemo } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { isSolanaEnabled } from '../../util/featureFlag';
import { useWalletContext } from '../providers/WalletProvider';
import type { EvmWalletHandle, WalletHandle } from '../types';

function getEvmTransactionRequest(transactionRequest: unknown) {
  if (!transactionRequest) {
    throw new Error('EVM transaction payload is missing.');
  }

  return transactionRequest as Parameters<EvmWalletHandle['sendTransaction']>[0]['txRequest'];
}

function getSolanaSerializedTransaction(transactionRequest: unknown): string {
  if (
    typeof transactionRequest !== 'object' ||
    transactionRequest === null ||
    !('data' in transactionRequest) ||
    typeof transactionRequest.data !== 'string'
  ) {
    throw new Error('Solana transaction payload is missing.');
  }

  return transactionRequest.data;
}

export function useWallets(): {
  sourceWallet: WalletHandle;
  destinationWallet: WalletHandle;
} {
  const [networks] = useNetworks();
  const evmWalletContext = useWalletContext('evm');
  const solanaWalletContext = useWalletContext('solana');
  const evmWallet = useMemo<WalletHandle>(
    () => ({
      ...evmWalletContext,
      sendTransaction: (transactionRequest) =>
        evmWalletContext.sendTransaction({
          ecosystem: 'evm',
          txRequest: getEvmTransactionRequest(transactionRequest),
        }),
    }),
    [evmWalletContext],
  );
  const solanaWallet = useMemo<WalletHandle>(
    () => ({
      ...solanaWalletContext,
      sendTransaction: (transactionRequest) =>
        solanaWalletContext.sendTransaction({
          ecosystem: 'solana',
          serializedTransaction: getSolanaSerializedTransaction(transactionRequest),
        }),
    }),
    [solanaWalletContext],
  );

  const getWalletForChainId = useCallback(
    (chainId: number): WalletHandle => {
      switch (chainId) {
        case ChainId.Solana:
          return isSolanaEnabled() ? solanaWallet : evmWallet;

        default:
          return evmWallet;
      }
    },
    [evmWallet, solanaWallet],
  );

  const sourceWallet = useMemo<WalletHandle>(
    () => getWalletForChainId(networks.sourceChain.id),
    [getWalletForChainId, networks.sourceChain.id],
  );

  const destinationWallet = useMemo<WalletHandle>(
    () => getWalletForChainId(networks.destinationChain.id),
    [getWalletForChainId, networks.destinationChain.id],
  );

  return {
    sourceWallet,
    destinationWallet,
  };
}

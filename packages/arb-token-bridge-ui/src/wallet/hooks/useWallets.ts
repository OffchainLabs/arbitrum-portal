import { useCallback, useMemo } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { isSolanaEnabled } from '../../util/featureFlag';
import { useWalletContext } from '../providers/WalletProvider';
import type { WalletHandle } from '../types';

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
      sendTransaction: (input) => {
        if (!input.txRequest) {
          throw new Error('Invalid transaction: expected an EVM transaction.');
        }

        return evmWalletContext.sendTransaction(input);
      },
    }),
    [evmWalletContext],
  );
  const solanaWallet = useMemo<WalletHandle>(
    () => ({
      ...solanaWalletContext,
      sendTransaction: (input) => {
        if (!input.serializedTransaction) {
          throw new Error('Invalid transaction: expected a Solana transaction.');
        }

        return solanaWalletContext.sendTransaction(input);
      },
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

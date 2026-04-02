import { useCallback, useMemo } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { isSolanaEnabled } from '../../util/featureFlag';
import { useEvmWalletContext } from '../providers/EvmWalletProvider';
import { useSolanaWalletContext } from '../providers/SolanaWalletProvider';
import { WalletHandle } from '../types';

export function useWallets(): {
  sourceWallet: WalletHandle;
  destinationWallet: WalletHandle;
} {
  const [networks] = useNetworks();
  const evmWallet = useEvmWalletContext();
  const solanaWallet = useSolanaWalletContext();
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

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

  const getWalletForChainId = useCallback(
    (chainId: number): WalletHandle => {
      switch (chainId) {
        case ChainId.Solana:
          return (isSolanaEnabled() ? solanaWalletContext : evmWalletContext) as WalletHandle;

        default:
          return evmWalletContext as WalletHandle;
      }
    },
    [evmWalletContext, solanaWalletContext],
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

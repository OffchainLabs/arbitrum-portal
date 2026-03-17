import { useCallback, useMemo } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { useEvmWalletContext } from '../contexts/EvmWalletContext';
import { WalletHandle } from '../types';

export function useWallets(): {
  sourceWallet: WalletHandle;
  destinationWallet: WalletHandle;
} {
  const [networks] = useNetworks();
  const evmWallet = useEvmWalletContext();
  const getWalletForChainId = useCallback(
    (chainId: number): WalletHandle => {
      switch (chainId) {
        default:
          return evmWallet;
      }
    },
    [evmWallet],
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

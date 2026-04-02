import { useAppKit, useAppKitNetwork } from '@reown/appkit/react';
import { useCallback } from 'react';
import type { Chain } from 'wagmi/chains';

import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { isSolanaEnabled } from '../../util/featureFlag';
import { getWagmiChain } from '../../util/wagmi/getWagmiChain';

export function useWalletModal() {
  const { open } = useAppKit();
  const { switchNetwork } = useAppKitNetwork();
  const [networks] = useNetworks();

  const getChainForChainId = useCallback(
    (chainId: number): Chain => {
      if (networks.sourceChain.id === chainId) {
        return networks.sourceChain;
      }

      if (networks.destinationChain.id === chainId) {
        return networks.destinationChain;
      }

      return getWagmiChain(chainId);
    },
    [networks.destinationChain, networks.sourceChain],
  );

  const openConnectModal = useCallback(
    async (chainId = networks.sourceChain.id) => {
      if (isSolanaEnabled() && chainId === ChainId.Solana) {
        await open({ view: 'Connect', namespace: 'solana' });
        return;
      }

      await switchNetwork(getChainForChainId(chainId));
      await open({ view: 'Connect', namespace: 'eip155' });
    },
    [getChainForChainId, networks.sourceChain.id, open, switchNetwork],
  );

  return {
    openConnectModal,
  };
}

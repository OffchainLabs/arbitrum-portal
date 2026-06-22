import { useAppKit } from '@reown/appkit/react';
import { useCallback } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { isSolanaEnabled } from '../../util/featureFlag';
import { appKit } from '../../util/wagmi/setup';

export function useWalletModal() {
  const { open } = useAppKit();
  const [networks] = useNetworks();

  const openConnectModal = useCallback(
    async (chainId: ChainId = networks.sourceChain.id) => {
      if (isSolanaEnabled() && chainId === ChainId.Solana) {
        await open({ view: 'Connect', namespace: 'solana' });
        return;
      }

      if (appKit) {
        const caipNetwork = appKit.getCaipNetwork('eip155', chainId);
        if (caipNetwork) {
          appKit.setCaipNetwork(caipNetwork);
        }
      }
      await open({ view: 'Connect', namespace: 'eip155' });
    },
    [networks.sourceChain.id, open],
  );

  return {
    openConnectModal,
  };
}

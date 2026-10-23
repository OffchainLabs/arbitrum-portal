import { useAppKit } from '@reown/appkit/react';
import { useCallback } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { appKit } from '../../util/wagmi/setup';
import { ecosystems } from '../ecosystems';
import { getWalletEcosystem } from '../getWalletEcosystem';
import type { WalletEcosystem } from '../types';

export function useWalletModal() {
  const { open } = useAppKit();
  const [networks] = useNetworks();

  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;

  const openConnectModalFor = useCallback(
    async (ecosystem: WalletEcosystem) => {
      const { namespace, isAppKitNetworkIdChainId } = ecosystems[ecosystem];
      if (appKit) {
        // Preselect the chain of that ecosystem on either side of the transfer
        const chainId = [sourceChainId, destinationChainId].find(
          (id) => getWalletEcosystem(id) === ecosystem,
        );
        const caipNetwork = appKit.getCaipNetwork(
          namespace,
          isAppKitNetworkIdChainId ? chainId : undefined,
        );
        if (caipNetwork) {
          appKit.setCaipNetwork(caipNetwork);
        }
      }
      await open({ view: 'Connect', namespace });
    },
    [sourceChainId, destinationChainId, open],
  );

  const openConnectModal = useCallback(
    () => openConnectModalFor(getWalletEcosystem(sourceChainId)),
    [openConnectModalFor, sourceChainId],
  );

  return {
    openConnectModal,
    openConnectModalFor,
  };
}

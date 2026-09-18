import { useAppKit } from '@reown/appkit/react';
import { useCallback } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { appKit } from '../../util/wagmi/setup';
import { getWalletEcosystem } from '../getWalletEcosystem';

export function useWalletModal(chainId?: number) {
  const { open } = useAppKit();
  const [networks] = useNetworks();

  const selectedChainId = chainId ?? networks.sourceChain.id;
  const namespaces = { evm: 'eip155', solana: 'solana' } as const;
  const namespace = namespaces[getWalletEcosystem(selectedChainId)];

  const openConnectModal = useCallback(async () => {
    if (appKit && networks.sourceChain) {
      const caipNetwork = appKit.getCaipNetwork(
        namespace,
        namespace === 'eip155' ? selectedChainId : undefined,
      );
      if (caipNetwork) {
        appKit.setCaipNetwork(caipNetwork);
      }
    }
    await open({ view: 'Connect', namespace });
  }, [networks.sourceChain, namespace, selectedChainId, open]);

  return {
    openConnectModal,
  };
}

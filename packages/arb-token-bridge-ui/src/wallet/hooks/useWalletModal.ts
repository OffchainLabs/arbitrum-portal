import { useAppKit } from '@reown/appkit/react';
import { useCallback } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { appKit } from '../../util/wagmi/setup';

export function useWalletModal() {
  const { open } = useAppKit();
  const [networks] = useNetworks();

  const openConnectModal = useCallback(async () => {
    if (appKit && networks.sourceChain) {
      const caipNetwork = appKit.getCaipNetwork('eip155', networks.sourceChain.id);
      if (caipNetwork) {
        appKit.setCaipNetwork(caipNetwork);
      }
    }
    await open({ view: 'Connect', namespace: 'eip155' });
  }, [networks.sourceChain, open]);

  return {
    openConnectModal,
  };
}

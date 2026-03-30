import { useAppKit, useAppKitNetwork } from '@reown/appkit/react';
import { useCallback } from 'react';

import { useNetworks } from '../../hooks/useNetworks';

export function useWalletModal() {
  const { open } = useAppKit();
  const { switchNetwork } = useAppKitNetwork();
  const [networks] = useNetworks();

  const openConnectModal = useCallback(async () => {
    await switchNetwork(networks.sourceChain);
    await open({ view: 'Connect', namespace: 'eip155' });
  }, [networks.sourceChain, open, switchNetwork]);

  return {
    openConnectModal,
  };
}

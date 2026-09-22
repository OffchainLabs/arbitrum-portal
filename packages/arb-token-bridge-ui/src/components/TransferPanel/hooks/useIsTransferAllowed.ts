import { useMemo } from 'react';

import { useNetworks } from '../../../hooks/useNetworks';
import { isTransferExecutionAvailable } from '../../../services/transferExecutionAvailability';
import { useAppState } from '../../../state';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { useDestinationAddressError } from './useDestinationAddressError';

export function useIsTransferAllowed() {
  const {
    app: {
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth },
    },
  } = useAppState();
  const { sourceWallet } = useWallets();
  const [networks] = useNetworks();
  const { destinationAddressError } = useDestinationAddressError();

  return useMemo(() => {
    const isConnectedToTheWrongChain = sourceWallet.account.chainId !== networks.sourceChain.id;

    if (
      !isTransferExecutionAvailable({
        chainId: networks.sourceChain.id,
        wallet: sourceWallet,
        arbTokenBridgeReady: arbTokenBridgeLoaded && Boolean(eth),
      })
    ) {
      return false;
    }
    if (isConnectedToTheWrongChain) {
      return false;
    }
    if (!!destinationAddressError) {
      return false;
    }
    return true;
  }, [arbTokenBridgeLoaded, destinationAddressError, eth, networks.sourceChain.id, sourceWallet]);
}

import { useMemo } from 'react';

import { useNetworks } from '../../../hooks/useNetworks';
import { useAppState } from '../../../state';
import { isLifiRoute } from '../../../util/TransferRouteUtils';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { useDestinationAddressError } from './useDestinationAddressError';
import { useRouteStore } from './useRouteStore';

export function useIsTransferAllowed() {
  const {
    app: {
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth },
    },
  } = useAppState();
  const { sourceWallet } = useWallets();
  const selectedRoute = useRouteStore((state) => state.selectedRoute);
  const [networks] = useNetworks();
  const { destinationAddressError } = useDestinationAddressError();

  return useMemo(() => {
    const isConnectedToTheWrongChain = sourceWallet.account.chainId !== networks.sourceChain.id;

    if (!sourceWallet.isConnected || !sourceWallet.account.address) {
      return false;
    }
    if (!isLifiRoute(selectedRoute) && (!arbTokenBridgeLoaded || !eth)) {
      return false;
    }
    if (isConnectedToTheWrongChain) {
      return false;
    }
    if (!!destinationAddressError) {
      return false;
    }
    return true;
  }, [
    arbTokenBridgeLoaded,
    destinationAddressError,
    eth,
    networks.sourceChain.id,
    sourceWallet,
    selectedRoute,
  ]);
}

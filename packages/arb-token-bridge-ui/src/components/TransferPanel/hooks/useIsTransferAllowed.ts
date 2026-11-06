import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { useNetworks } from '../../../hooks/useNetworks';
import { useAppState } from '../../../state';
import { useDestinationAddressError } from './useDestinationAddressError';
import { isLifiRoute, useRouteStore } from './useRouteStore';

export function useIsTransferAllowed() {
  const {
    app: {
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth },
    },
  } = useAppState();
  // do not use `useChainId` because it won't detect chains outside of our wagmi config
  const { address: walletAddress, isConnected, chain } = useAccount();
  const selectedRoute = useRouteStore((state) => state.selectedRoute);
  const [networks] = useNetworks();
  const { destinationAddressError } = useDestinationAddressError();

  return useMemo(() => {
    const isConnectedToTheWrongChain = chain?.id !== networks.sourceChain.id;
    // LiFi routes don't use the bridge SDK
    const requiresBridgeSdk = !isLifiRoute(selectedRoute);

    if (requiresBridgeSdk && !arbTokenBridgeLoaded) {
      return false;
    }
    if (requiresBridgeSdk && !eth) {
      return false;
    }
    if (!isConnected) {
      return false;
    }
    if (!walletAddress) {
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
    chain?.id,
    destinationAddressError,
    isConnected,
    eth,
    networks.sourceChain.id,
    selectedRoute,
    walletAddress,
  ]);
}

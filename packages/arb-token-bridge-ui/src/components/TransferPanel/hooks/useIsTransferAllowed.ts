import { useMemo } from 'react';

import { useNetworks } from '../../../hooks/useNetworks';
import { useAppState } from '../../../state';
import { useWallets } from '../../../wallet/hooks/useWallets';
import { useDestinationAddressError } from './useDestinationAddressError';
import { isLifiRoute, useRouteStore } from './useRouteStore';

export function useIsTransferAllowed() {
  const {
    app: {
      arbTokenBridgeLoaded,
      arbTokenBridge: { eth },
    },
  } = useAppState();
  const { sourceWallet } = useWallets();
  const walletAddress = sourceWallet.account.address;
  const selectedRoute = useRouteStore((state) => state.selectedRoute);
  const [networks] = useNetworks();
  const { destinationAddressError } = useDestinationAddressError();

  return useMemo(() => {
    const isConnectedToTheWrongChain = sourceWallet.account.chainId !== networks.sourceChain.id;
    // LiFi routes don't use the EVM bridge SDK
    const requiresBridgeSdk = !isLifiRoute(selectedRoute);

    if (requiresBridgeSdk && !arbTokenBridgeLoaded) {
      return false;
    }
    if (requiresBridgeSdk && !eth) {
      return false;
    }
    if (!sourceWallet.isConnected) {
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
    destinationAddressError,
    eth,
    networks.sourceChain.id,
    selectedRoute,
    sourceWallet.account.chainId,
    sourceWallet.isConnected,
    walletAddress,
  ]);
}

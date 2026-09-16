import { useMemo } from 'react';

import { useNetworks } from '../../../hooks/useNetworks';
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
  const walletAddress = sourceWallet.account.address;
  const [networks] = useNetworks();
  const { destinationAddressError } = useDestinationAddressError();

  return useMemo(() => {
    const isConnectedToTheWrongChain = sourceWallet.account.chainId !== networks.sourceChain.id;

    if (!arbTokenBridgeLoaded) {
      return false;
    }
    if (!eth) {
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
    sourceWallet.account.chainId,
    sourceWallet.isConnected,
    walletAddress,
  ]);
}

import { useCallback } from 'react';
import { create } from 'zustand';

import { useDestinationSelection } from '@/bridge/hooks/useDestinationToken';
import { useNetworks } from '@/bridge/hooks/useNetworks';
import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';
import { trackEvent } from '@/bridge/util/AnalyticsUtils';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

/**
 * The DRIP card promotes USDG vaults on Arbitrum One, so it follows any submitted transfer that
 * lands Arbitrum One USDG, swaps into it included. Withdrawals out of Arbitrum One never match.
 *
 * `destinationChainTokenAddress` must be the token's contract on the destination chain, not the
 * parent-chain `address` a bridge token record carries.
 */
export function shouldShowUsdgDripCard({
  destinationChainId,
  destinationChainTokenAddress,
}: {
  destinationChainId: number;
  destinationChainTokenAddress: string | undefined;
}): boolean {
  return (
    destinationChainId === ChainId.ArbitrumOne &&
    addressesEqual(destinationChainTokenAddress, CommonAddress.ArbitrumOne.USDG)
  );
}

type UsdgDripCardStore = {
  isOpen: boolean;
  show: () => void;
  dismiss: () => void;
};

// In memory on purpose: the card belongs to a transfer, so a dismissal only lasts until the next
// qualifying transfer and nothing carries over a reload. `shown` is tracked here so it counts the
// card becoming visible, not every qualifying transfer while it is still open.
export const useUsdgDripCardStore = create<UsdgDripCardStore>((set, get) => ({
  isOpen: false,
  show: () => {
    if (get().isOpen) {
      return;
    }
    trackEvent('USDG DRIP Card', { action: 'shown' });
    set({ isOpen: true });
  },
  dismiss: () => set({ isOpen: false }),
}));

/**
 * Every submit path calls the returned callback once the source transaction is out. It closes
 * over the render the user clicked in, so it sees the transfer's own destination token rather
 * than whatever the panel shows afterwards.
 */
export function useShowUsdgDripCardAfterSubmit() {
  const [networks] = useNetworks();
  const { destinationAddress: destinationChainTokenAddress } = useDestinationSelection();
  const show = useUsdgDripCardStore((state) => state.show);
  const destinationChainId = networks.destinationChain.id;

  return useCallback(() => {
    if (shouldShowUsdgDripCard({ destinationChainId, destinationChainTokenAddress })) {
      show();
    }
  }, [destinationChainId, destinationChainTokenAddress, show]);
}

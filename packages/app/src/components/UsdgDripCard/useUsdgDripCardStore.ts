import { create } from 'zustand';

import { ChainId } from '@/bridge/types/ChainId';
import { addressesEqual } from '@/bridge/util/AddressUtils';
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
// qualifying transfer and nothing carries over a reload.
export const useUsdgDripCardStore = create<UsdgDripCardStore>((set) => ({
  isOpen: false,
  show: () => set({ isOpen: true }),
  dismiss: () => set({ isOpen: false }),
}));

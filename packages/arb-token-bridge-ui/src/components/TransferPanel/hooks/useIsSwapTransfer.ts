import { arbitrum } from '@wagmi/core/chains';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNetworks } from '../../../hooks/useNetworks';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { addressesEqual } from '../../../util/AddressUtils';
import { arbitrumNova } from '../../../util/wagmi/wagmiAdditionalNetworks';

export function useIsSwapTransfer() {
  const [selectedToken] = useSelectedToken();
  const [{ destinationToken }] = useArbQueryParams();
  const [{ sourceChain, destinationChain }] = useNetworks();

  const isArbOneNovaTransfer =
    (sourceChain.id === arbitrum.id && destinationChain.id === arbitrumNova.id) ||
    (sourceChain.id === arbitrumNova.id && destinationChain.id === arbitrum.id);

  if (isArbOneNovaTransfer) {
    return true;
  }

  /**
   * Destination token is using l1 address and not address on the destination chain
   * We can compare both address to know if token is the same without checking l2 address
   */
  return !addressesEqual(destinationToken, selectedToken?.address);
}

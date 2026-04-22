import { useMemo } from 'react';

import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import {
  areEquivalentBridgeTokens,
  getBridgeTokenLookupAddress,
} from '../../../util/BridgeTokenAddressUtils';
import { useIsSwapTransfer } from './useIsSwapTransfer';

/**
 * Returns the token address that should be written back into query state when the
 * user switches source/destination networks.
 *
 * - `undefined`: keep the current selected token as-is
 * - `null`: clear the selected token (native flow in swap mode)
 * - `string`: switch to this resolved destination token address
 */
export function useNetworkSwitchSelectedTokenAddress() {
  const isSwapTransfer = useIsSwapTransfer();
  const [selectedToken] = useSelectedToken();
  const destinationToken = useDestinationToken();

  return useMemo(() => {
    if (isSwapTransfer) {
      return getBridgeTokenLookupAddress(destinationToken) ?? null;
    }

    if (!destinationToken || areEquivalentBridgeTokens(destinationToken, selectedToken)) {
      return undefined;
    }

    return getBridgeTokenLookupAddress(destinationToken);
  }, [destinationToken, isSwapTransfer, selectedToken]);
}

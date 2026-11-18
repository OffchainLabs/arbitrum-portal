import { useMemo } from 'react';

import { allowedLifiSourceChainIds } from '../../app/api/crosschain-transfers/constants';
import { isLifiEnabled } from '../../util/featureFlag';
import {
  getDestinationChainIds,
  getSupportedChainIds,
  isNetwork,
  sortChainIds,
} from '../../util/networks';
import { DisabledFeatures } from '../useArbQueryParams';
import { useDisabledFeatures } from '../useDisabledFeatures';
import { useIsTestnetMode } from '../useIsTestnetMode';
import { useNetworks } from '../useNetworks';

export function useChainIdsForNetworkSelection({ isSource }: { isSource: boolean }) {
  const [networks] = useNetworks();
  const [isTestnetMode] = useIsTestnetMode();

  const { isFeatureDisabled } = useDisabledFeatures();

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS,
  );

  return useMemo(() => {
    const isLifiFeatureEnabled = isLifiEnabled();

    if (isSource) {
      const sourceChainIds = Array.from(
        new Set([
          ...getSupportedChainIds({
            includeMainnets: !isTestnetMode,
            includeTestnets: isTestnetMode,
          }),
          ...(isLifiFeatureEnabled && !isTestnetMode ? allowedLifiSourceChainIds : []),
        ]),
      );

      // do not display chains that have no destination chains
      return sortChainIds(
        sourceChainIds.filter(
          (chainId) =>
            getDestinationChainIds(chainId, {
              includeLifiEnabledChainPairs: isLifiFeatureEnabled,
              disableTransfersToNonArbitrumChains,
            }).length > 0,
        ),
      );
    }

    const destinationChainIds = getDestinationChainIds(networks.sourceChain.id, {
      includeLifiEnabledChainPairs: isLifiFeatureEnabled,
      disableTransfersToNonArbitrumChains,
    });

    if (disableTransfersToNonArbitrumChains) {
      return destinationChainIds.filter((chainId) => !isNetwork(chainId).isNonArbitrumNetwork);
    }

    return destinationChainIds;
  }, [isSource, isTestnetMode, networks.sourceChain.id, disableTransfersToNonArbitrumChains]);
}

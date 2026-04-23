import { sanitizeQueryParams } from '../../../hooks/useNetworks';
import { getQueryParamsForSelectedToken } from '../../../hooks/useSelectedToken';
import { ChainId } from '../../../types/ChainId';

export function getNetworkSwitchQueryParams({
  sourceChainId,
  destinationChainId,
  disableTransfersToNonArbitrumChains,
  selectedTokenAddressAfterSwitch,
}: {
  sourceChainId: ChainId;
  destinationChainId: ChainId;
  disableTransfersToNonArbitrumChains: boolean;
  selectedTokenAddressAfterSwitch: string | null | undefined;
}) {
  const { sourceChainId: nextSourceChainId, destinationChainId: nextDestinationChainId } =
    sanitizeQueryParams({
      sourceChainId: destinationChainId,
      destinationChainId: sourceChainId,
      disableTransfersToNonArbitrumChains,
    });

  return {
    sourceChain: nextSourceChainId,
    destinationChain: nextDestinationChainId,
    ...(typeof selectedTokenAddressAfterSwitch === 'undefined'
      ? {}
      : getQueryParamsForSelectedToken({
          tokenAddress: selectedTokenAddressAfterSwitch,
          sourceChainId: nextSourceChainId,
          destinationChainId: nextDestinationChainId,
        })),
  };
}

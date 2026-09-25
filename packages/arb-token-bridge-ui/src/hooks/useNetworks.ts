import { useCallback, useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';
import type { Chain } from 'wagmi/chains';

import { ChainId } from '../types/ChainId';
import { isSupportedChainId } from '../util/chainUtils';
import { getChainMetadata } from '../util/networkMetadata';
import { sanitizeQueryParams } from '../util/queryParamUtils';
import { DisabledFeatures, useArbQueryParams } from './useArbQueryParams';
import { useDisabledFeatures } from './useDisabledFeatures';

export { isSupportedChainId, sanitizeQueryParams };

export type UseNetworksState = {
  sourceChain: Chain;
  destinationChain: Chain;
};

export type UseNetworksSetStateParams = {
  sourceChainId: ChainId;
  destinationChainId?: ChainId;
};
export type UseNetworksSetState = (params: UseNetworksSetStateParams) => void;

export function useNetworks(): [UseNetworksState, UseNetworksSetState] {
  const [{ sourceChain: sourceChainId, destinationChain: destinationChainId }, setQueryParams] =
    useArbQueryParams();

  const { isFeatureDisabled } = useDisabledFeatures();

  const disableTransfersToNonArbitrumChains = isFeatureDisabled(
    DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS,
  );

  const { sourceChainId: validSourceChainId, destinationChainId: validDestinationChainId } =
    useMemo(
      () =>
        sanitizeQueryParams({
          sourceChainId,
          destinationChainId,
          disableTransfersToNonArbitrumChains,
        }),
      [destinationChainId, sourceChainId, disableTransfersToNonArbitrumChains],
    );

  const {
    data = {
      sourceChain: getChainMetadata(validSourceChainId),
      destinationChain: getChainMetadata(validDestinationChainId),
    },
  } = useSWRImmutable(
    [validSourceChainId, validDestinationChainId, 'useNetworks'] as const,
    ([_validSourceChainId, _validDestinationChainId]) => {
      const sourceChain = getChainMetadata(_validSourceChainId);
      const destinationChain = getChainMetadata(_validDestinationChainId);
      return { sourceChain, destinationChain };
    },
  );

  const setState = useCallback(
    ({
      sourceChainId: newSourceChainId,
      destinationChainId: newDestinationChainId,
    }: UseNetworksSetStateParams) => {
      const { sourceChainId: validSourceChainId, destinationChainId: validDestinationChainId } =
        sanitizeQueryParams({
          sourceChainId: newSourceChainId,
          destinationChainId: newDestinationChainId,
          disableTransfersToNonArbitrumChains,
        });
      setQueryParams({
        sourceChain: validSourceChainId,
        destinationChain: validDestinationChainId,
      });
    },
    [setQueryParams, disableTransfersToNonArbitrumChains],
  );

  // The return values of the hook will always be the sanitized values
  return useMemo(() => {
    return [
      {
        sourceChain: data.sourceChain,
        destinationChain: data.destinationChain,
      },
      setState,
    ];
  }, [data.destinationChain, data.sourceChain, setState]);
}

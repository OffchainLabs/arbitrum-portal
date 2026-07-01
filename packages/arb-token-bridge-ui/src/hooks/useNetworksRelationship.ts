import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { useMemo } from 'react';
import { Chain } from 'wagmi/chains';

import { isLifiTransfer } from '../app/api/crosschain-transfers/utils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { UseNetworksState } from './useNetworks';

type UseNetworksRelationshipState = {
  childChain: Chain;
  childChainProvider: StaticJsonRpcProvider;
  parentChain: Chain;
  parentChainProvider: StaticJsonRpcProvider;
  isDepositMode: boolean;
  /** true if route is supported through lifi (regardless of selected token)  */
  isLifi: boolean;
};
export function useNetworksRelationship({
  sourceChain,
  sourceChainProvider,
  destinationChain,
  destinationChainProvider,
}: UseNetworksState): UseNetworksRelationshipState {
  return useMemo(() => {
    const { parentChainId, isDepositMode } = getNetworksRelationship({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id,
    });

    const isLifi = isLifiTransfer({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id,
    });

    const isParentSource = parentChainId === sourceChain.id;

    return {
      parentChain: isParentSource ? sourceChain : destinationChain,
      parentChainProvider: isParentSource ? sourceChainProvider : destinationChainProvider,
      childChain: isParentSource ? destinationChain : sourceChain,
      childChainProvider: isParentSource ? destinationChainProvider : sourceChainProvider,
      isDepositMode,
      isLifi,
    };
  }, [sourceChain, destinationChain, destinationChainProvider, sourceChainProvider]);
}

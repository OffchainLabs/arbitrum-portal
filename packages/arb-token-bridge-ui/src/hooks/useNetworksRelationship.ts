import { useMemo } from 'react';
import type { Chain } from 'wagmi/chains';

import { isLifiTransfer } from '../app/api/crosschain-transfers/utils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { UseNetworksState } from './useNetworks';

type UseNetworksRelationshipState = {
  childChain: Chain;
  parentChain: Chain;
  isDepositMode: boolean;
  /** true if route is supported through lifi (regardless of selected token)  */
  isLifi: boolean;
};
export function useNetworksRelationship({
  sourceChain,
  destinationChain,
}: UseNetworksState): UseNetworksRelationshipState {
  return useMemo(() => {
    const { childChainId, parentChainId, isDepositMode } = getNetworksRelationship({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id,
    });

    const isLifi = isLifiTransfer({
      sourceChainId: sourceChain.id,
      destinationChainId: destinationChain.id,
    });

    const sourceChainIsParent = sourceChain.id === parentChainId;
    const sourceChainIsChild = sourceChain.id === childChainId;

    return {
      childChain: sourceChainIsChild ? sourceChain : destinationChain,
      parentChain: sourceChainIsParent ? sourceChain : destinationChain,
      isDepositMode,
      isLifi,
    };
  }, [sourceChain, destinationChain]);
}

import { ChainId } from '../types/ChainId';
import { isDepositMode } from './isDepositMode';

/**
 * Resolves the parent/child relationship for a source/destination chain pair.
 *
 * This is the single source of truth shared by `useNetworksRelationship` (UI) and
 * the LiFi transaction-history API transform, so that a transfer is keyed
 * identically whether it comes from the local cache or the history API. Keep the
 * special cases below in sync between both consumers by only editing them here.
 */
export function getNetworksRelationship({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}): {
  parentChainId: number;
  childChainId: number;
  isDepositMode: boolean;
} {
  // Robinhood to Superposition, set Robinhood as parent chain
  if (sourceChainId === ChainId.RobinhoodChain && destinationChainId === ChainId.Superposition) {
    return {
      parentChainId: sourceChainId,
      childChainId: destinationChainId,
      isDepositMode: true,
    };
  }

  // Superposition to Robinhood, set Robinhood as parent chain
  if (sourceChainId === ChainId.Superposition && destinationChainId === ChainId.RobinhoodChain) {
    return {
      parentChainId: destinationChainId,
      childChainId: sourceChainId,
      isDepositMode: false,
    };
  }

  // Ape to Superposition, set Superposition as parent chain
  if (sourceChainId === ChainId.ApeChain && destinationChainId === ChainId.Superposition) {
    return {
      parentChainId: destinationChainId,
      childChainId: sourceChainId,
      isDepositMode: false,
    };
  }

  // Superposition to Ape, set Superposition as parent chain
  if (sourceChainId === ChainId.Superposition && destinationChainId === ChainId.ApeChain) {
    return {
      parentChainId: sourceChainId,
      childChainId: destinationChainId,
      isDepositMode: true,
    };
  }

  // Nova to ArbitrumOne is a LiFi sibling transfer, not parent-child.
  // Set Nova as parent so the LiFi token list keyed on (parent=Nova, child=One) resolves.
  if (sourceChainId === ChainId.ArbitrumNova && destinationChainId === ChainId.ArbitrumOne) {
    return {
      parentChainId: sourceChainId,
      childChainId: destinationChainId,
      isDepositMode: true,
    };
  }

  if (isDepositMode({ sourceChainId, destinationChainId })) {
    return {
      parentChainId: sourceChainId,
      childChainId: destinationChainId,
      isDepositMode: true,
    };
  }

  return {
    parentChainId: destinationChainId,
    childChainId: sourceChainId,
    isDepositMode: false,
  };
}

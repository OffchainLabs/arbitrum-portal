import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport';

import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { isDepositMode } from '../../../util/isDepositMode';
import { getDestinationChainIds } from '../../../util/networks';
import { isDisabledCanonicalTransfer } from '../TransferDisabledDialog';
import { useIsSwapTransfer } from './useIsSwapTransfer';
import { useSelectedTokenIsWithdrawOnly } from './useSelectedTokenIsWithdrawOnly';

export function isArbitrumCanonicalTransfer({
  sourceChainId,
  destinationChainId,
  childChainId,
  parentChainId,
  isSelectedTokenWithdrawOnly,
  isSelectedTokenWithdrawOnlyLoading,
  selectedToken,
  isSwap,
}: {
  sourceChainId: number;
  destinationChainId: number;
  childChainId: number;
  parentChainId: number;
  isSelectedTokenWithdrawOnly: boolean;
  isSelectedTokenWithdrawOnlyLoading: boolean;
  selectedToken: ERC20BridgeToken | null;
  isSwap: boolean;
}): boolean {
  const isDeposit = isDepositMode({ sourceChainId, destinationChainId });
  const isTeleportMode = isValidTeleportChainPair({
    destinationChainId,
    sourceChainId,
  });
  const isValidPair = getDestinationChainIds(sourceChainId).includes(destinationChainId);

  if (!isValidPair) {
    return false;
  }
  if (isSwap) {
    return false;
  }

  return !isDisabledCanonicalTransfer({
    childChainId: childChainId,
    isDepositMode: isDeposit,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    isTeleportMode,
    parentChainId: parentChainId,
    selectedToken,
  });
}

export const useIsArbitrumCanonicalTransfer = function () {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly();
  const isSwap = useIsSwapTransfer();

  return isArbitrumCanonicalTransfer({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id,
    childChainId: childChain.id,
    parentChainId: parentChain.id,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    selectedToken,
    isSwap,
  });
};

import useSWRImmutable from 'swr/immutable';

import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { isDepositMode } from '../../../util/isDepositMode';
import { getDestinationChainIds } from '../../../util/networks';
import { isDisabledCanonicalTransfer } from '../TransferDisabledDialog';
import { useIsSwapTransfer } from './useIsSwapTransfer';
import { useSelectedTokenIsWithdrawOnly } from './useSelectedTokenIsWithdrawOnly';

export async function isArbitrumCanonicalTransfer({
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
}): Promise<boolean> {
  const isDeposit = isDepositMode({ sourceChainId, destinationChainId });
  const isValidPair = getDestinationChainIds(sourceChainId).includes(destinationChainId);

  if (!isValidPair) {
    return false;
  }
  if (isSwap) {
    return false;
  }

  return !(await isDisabledCanonicalTransfer({
    childChainId: childChainId,
    isDepositMode: isDeposit,
    isSelectedTokenWithdrawOnly,
    isSelectedTokenWithdrawOnlyLoading,
    parentChainId: parentChainId,
    selectedToken,
  }));
}

export const useIsArbitrumCanonicalTransfer = function () {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const { isSelectedTokenWithdrawOnly, isSelectedTokenWithdrawOnlyLoading } =
    useSelectedTokenIsWithdrawOnly();
  const isSwap = useIsSwapTransfer();

  const { data: isCanonicalTransfer = false } = useSWRImmutable(
    [
      networks.sourceChain.id,
      networks.destinationChain.id,
      childChain.id,
      parentChain.id,
      isSelectedTokenWithdrawOnly,
      isSelectedTokenWithdrawOnlyLoading,
      selectedToken?.address ?? null,
      isSwap,
      'useIsArbitrumCanonicalTransfer',
    ] as const,
    ([
      sourceChainId,
      destinationChainId,
      childChainId,
      parentChainId,
      _isSelectedTokenWithdrawOnly,
      _isSelectedTokenWithdrawOnlyLoading,
      ,
      _isSwap,
    ]) =>
      isArbitrumCanonicalTransfer({
        sourceChainId,
        destinationChainId,
        childChainId,
        parentChainId,
        isSelectedTokenWithdrawOnly: _isSelectedTokenWithdrawOnly,
        isSelectedTokenWithdrawOnlyLoading: _isSelectedTokenWithdrawOnlyLoading,
        selectedToken,
        isSwap: _isSwap,
      }),
  );

  return isCanonicalTransfer;
};

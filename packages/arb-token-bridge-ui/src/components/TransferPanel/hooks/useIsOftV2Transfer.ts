import useSWRImmutable from 'swr/immutable';

import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { isOftTransfer } from '../../../services/fetchOftFeeEstimate';
import { useIsSwapTransfer } from './useIsSwapTransfer';

export const useIsOftV2Transfer = function () {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { isDepositMode } = useNetworksRelationship(networks);
  const isSwapTransfer = useIsSwapTransfer();

  const { data: isOft = false, isLoading } = useSWRImmutable(
    selectedToken
      ? [
          isDepositMode ? selectedToken.address : selectedToken.l2Address,
          networks.sourceChain.id,
          networks.destinationChain.id,
          isSwapTransfer,
          'oft-transfer',
        ]
      : null,
    async ([_sourceChainErc20Address, _sourceChainId, _destinationChainId, _isSwapTransfer]) =>
      _isSwapTransfer
        ? false
        : isOftTransfer({
            sourceChainId: _sourceChainId,
            destinationChainId: _destinationChainId,
            sourceChainErc20Address: _sourceChainErc20Address,
          }),
  );

  return { isOft, isLoading };
};

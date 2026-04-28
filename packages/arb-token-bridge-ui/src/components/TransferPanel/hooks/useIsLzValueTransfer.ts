import useSWRImmutable from 'swr/immutable';

import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { getLzValueTransferConfig } from '../../../token-bridge-sdk/lzValueTransferUtils';
import { useIsSwapTransfer } from './useIsSwapTransfer';

export const useIsLzValueTransfer = function () {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { isTeleportMode, isDepositMode } = useNetworksRelationship(networks);
  const isSwapTransfer = useIsSwapTransfer();

  const { data: isLzValueTransfer = false } = useSWRImmutable(
    selectedToken && !isTeleportMode
      ? [
          isDepositMode ? selectedToken.address : selectedToken.l2Address,
          networks.sourceChain.id,
          networks.destinationChain.id,
          isSwapTransfer,
          'lz-value-transfer',
        ]
      : null,
    async ([_sourceChainErc20Address, _sourceChainId, _destinationChainId, _isSwapTransfer]) =>
      _isSwapTransfer
        ? false
        : getLzValueTransferConfig({
            sourceChainId: _sourceChainId,
            destinationChainId: _destinationChainId,
            sourceChainErc20Address: _sourceChainErc20Address,
          }).isValid,
  );

  return isLzValueTransfer;
};

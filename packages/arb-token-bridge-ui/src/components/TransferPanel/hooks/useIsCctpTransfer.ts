import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenMainnetUSDC,
  isTokenSepoliaUSDC,
} from '../../../util/TokenUtils';
import { isNetwork } from '../../../util/networks';

export const useIsCctpTransfer = function () {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { childChain, isDepositMode } = useNetworksRelationship(networks);
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id);

  if (!selectedToken) {
    return false;
  }

  if (isDepositMode) {
    if (isTokenMainnetUSDC(selectedToken.address) && isArbitrumOne) {
      return true;
    }

    if (isTokenSepoliaUSDC(selectedToken.address) && isArbitrumSepolia) {
      return true;
    }
  } else {
    if (isTokenArbitrumOneNativeUSDC(selectedToken.address) && isArbitrumOne) {
      return true;
    }

    if (isTokenArbitrumSepoliaNativeUSDC(selectedToken.address) && isArbitrumSepolia) {
      return true;
    }
  }

  return false;
};

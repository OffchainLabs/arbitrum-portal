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
import { useIsSwapTransfer } from './useIsSwapTransfer';

export const useIsCctpTransfer = function () {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { childChain, isDepositMode, isTeleportMode } = useNetworksRelationship(networks);
  const { isArbitrumOne, isArbitrumSepolia } = isNetwork(childChain.id);
  const isSwap = useIsSwapTransfer();

  if (isSwap) {
    return false;
  }

  if (!selectedToken) {
    return false;
  }

  if (isTeleportMode) {
    return false;
  }

  if (isDepositMode) {
    if (isTokenMainnetUSDC(selectedToken.address) && isArbitrumOne) {
      return true;
    }

    // When transferring from Sepolia to Arbitrum Sepolia, for USDC, selectedToken is ArbitrumSepolia USDC
    if (
      (isTokenSepoliaUSDC(selectedToken.address) ||
        isTokenArbitrumSepoliaNativeUSDC(selectedToken.address)) &&
      isArbitrumSepolia
    ) {
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

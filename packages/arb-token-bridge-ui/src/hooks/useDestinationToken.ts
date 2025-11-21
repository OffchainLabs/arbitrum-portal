import { constants } from 'ethers';

import { getTokenOverride } from '../app/api/crosschain-transfers/utils';
import { useIsSwapTransfer } from '../components/TransferPanel/hooks/useIsSwapTransfer';
import { useAppState } from '../state';
import { addressesEqual } from '../util/AddressUtils';
import { ERC20BridgeToken } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNetworks } from './useNetworks';
import { useSelectedToken } from './useSelectedToken';

/**
 * Returns the destination token based on the destinationToken and token query parameters.
 *
 * - If destinationToken === selectedToken.address: return selectedToken
 * - If destinationToken is the zeroAddress: return ETH token (happen on chain with custom gas token)
 * - If destinationToken is set to a specific address: return that token from bridgeTokens
 * - If destinationToken is null: return null
 */
export function useDestinationToken(): ERC20BridgeToken | null {
  const [{ destinationToken }] = useArbQueryParams();
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const isSwapTransfer = useIsSwapTransfer();

  if (!isSwapTransfer) return selectedToken;

  // Case 1: destinationToken is the zeroAddress -> Return ETH
  // Use getTokenOverride to handle special cases like ApeChain WETH
  if (destinationToken && addressesEqual(destinationToken, constants.AddressZero)) {
    const override = getTokenOverride({
      fromToken: constants.AddressZero,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
    });
    return override.destination;
  }

  // Case 2: destinationToken is set to a specific token address
  if (destinationToken && bridgeTokens) {
    return bridgeTokens[destinationToken.toLowerCase()] ?? null;
  }

  // For regular chains (native ETH): return null (button will show native ETH)
  return null;
}

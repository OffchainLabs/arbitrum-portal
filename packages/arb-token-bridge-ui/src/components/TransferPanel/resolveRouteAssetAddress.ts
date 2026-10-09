import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import type { RouteType } from '../../util/TransferRouteUtils';
import { isLifiRoute } from '../../util/TransferRouteUtils';

export function resolveNativeUsdcDestinationAddress({
  destinationChainId,
  selectedRoute,
  selectedRouteContext,
}: {
  destinationChainId: number;
  selectedRoute: RouteType | undefined;
  selectedRouteContext: { toAmount: { token: { address: string } } } | undefined;
}): string | undefined {
  if (isLifiRoute(selectedRoute)) {
    return selectedRouteContext?.toAmount.token.address;
  }

  return {
    [ChainId.Ethereum]: CommonAddress.Ethereum.USDC,
    [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.USDC,
    [ChainId.Sepolia]: CommonAddress.Sepolia.USDC,
    [ChainId.ArbitrumSepolia]: CommonAddress.ArbitrumSepolia.USDC,
  }[destinationChainId];
}

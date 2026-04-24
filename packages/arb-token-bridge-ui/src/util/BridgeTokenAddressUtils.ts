import { constants } from 'ethers';

import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { ChainId } from '../types/ChainId';
import { addressesEqual } from './AddressUtils';
import { CommonAddress } from './CommonAddressUtils';

type TokenLookupLike =
  | Pick<ERC20BridgeToken, 'address' | 'importLookupAddress'>
  | { address?: string; importLookupAddress?: string }
  | null
  | undefined;

type TokenChildChainAddressLike =
  | Pick<ERC20BridgeToken, 'address' | 'l2Address'>
  | { address?: string; l2Address?: string }
  | null
  | undefined;

export function getBridgeTokenLookupAddress(token: TokenLookupLike) {
  if (!token) {
    return undefined;
  }

  return token.importLookupAddress ?? token.address;
}

export function areEquivalentBridgeTokens(a: TokenLookupLike, b: TokenLookupLike) {
  const addressA = getBridgeTokenLookupAddress(a);
  const addressB = getBridgeTokenLookupAddress(b);

  if (!addressA || !addressB) {
    return false;
  }

  return addressesEqual(addressA, addressB);
}

export function getBridgeTokenChildChainAddress(token: TokenChildChainAddressLike) {
  if (!token) {
    return undefined;
  }

  return token.l2Address;
}

// On ApeChain routes, the zero address is the address for the ETH -> WETH path.
export function isApeChainEthSelection({
  tokenAddress,
  sourceChainId,
  destinationChainId,
}: {
  tokenAddress: string | null | undefined;
  sourceChainId: number | undefined;
  destinationChainId: number | undefined;
}) {
  return (
    addressesEqual(tokenAddress ?? undefined, constants.AddressZero) &&
    (sourceChainId === ChainId.ApeChain || destinationChainId === ChainId.ApeChain)
  );
}

type TokenApeChainDestinationLike =
  | Pick<ERC20BridgeToken, 'address' | 'l2Address'>
  | { address?: string; l2Address?: string }
  | null
  | undefined;

export function isApeChainEthDestinationSelection(
  token: TokenApeChainDestinationLike,
  destinationChainId: number | undefined,
) {
  if (destinationChainId !== ChainId.ApeChain || !token) {
    return false;
  }

  return (
    addressesEqual(token.address, constants.AddressZero) ||
    addressesEqual(token.l2Address, CommonAddress.ApeChain.WETH)
  );
}

type TokenDestinationBalanceLike =
  | Pick<ERC20BridgeToken, 'address' | 'l2Address' | 'destinationBalanceAddress'>
  | { address?: string; l2Address?: string; destinationBalanceAddress?: string }
  | null
  | undefined;

export function getBridgeTokenDestinationBalanceAddress(
  token: TokenDestinationBalanceLike,
  options: { isDepositMode: boolean },
) {
  if (!token) {
    return undefined;
  }

  if (
    token.destinationBalanceAddress &&
    (!options.isDepositMode || addressesEqual(token.destinationBalanceAddress, token.address))
  ) {
    return token.destinationBalanceAddress;
  }

  if (options.isDepositMode) {
    return token.l2Address;
  }

  return token.address;
}

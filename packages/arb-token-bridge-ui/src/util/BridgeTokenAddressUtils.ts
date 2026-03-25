import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { addressesEqual } from './AddressUtils';

type TokenLookupLike =
  | Pick<ERC20BridgeToken, 'address' | 'importLookupAddress'>
  | { address?: string; importLookupAddress?: string }
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

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { addressesEqual } from '../../../util/AddressUtils';

export function useIsSwapTransfer() {
  const [selectedToken] = useSelectedToken();
  const [{ destinationToken }] = useArbQueryParams();

  if (
    !destinationToken ||
    addressesEqual(destinationToken, selectedToken?.address) ||
    addressesEqual(destinationToken, selectedToken?.importLookupAddress) ||
    addressesEqual(destinationToken, selectedToken?.l2Address)
  ) {
    return false;
  }

  return true;
}

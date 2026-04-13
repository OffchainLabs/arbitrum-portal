import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { addressesEqual } from '../../../util/AddressUtils';

export function useIsSwapTransfer() {
  const [selectedToken] = useSelectedToken();
  const [{ destinationToken }] = useArbQueryParams();

  if (!destinationToken) {
    return false;
  }

  if (addressesEqual(destinationToken, selectedToken?.address)) {
    return false;
  }

  if (addressesEqual(destinationToken, selectedToken?.importLookupAddress)) {
    return false;
  }

  if (addressesEqual(destinationToken, selectedToken?.l2Address)) {
    return false;
  }

  return true;
}

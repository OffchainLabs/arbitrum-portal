import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { addressesEqual } from '../../../util/AddressUtils';

export function useIsSwapTransfer() {
  const [selectedToken] = useSelectedToken();
  const [{ destinationToken }] = useArbQueryParams();

  return !addressesEqual(destinationToken, selectedToken?.address);
}

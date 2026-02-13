import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { addressesEqual } from '../../../util/AddressUtils';

export function useIsSwapTransfer() {
  const [selectedToken] = useSelectedToken();
  const [{ destinationToken }] = useArbQueryParams();

  /**
   * Destination token is using l1 address and not address on the destination chain
   * We can compare both address to know if token is the same without checking l2 address
   */
  return !addressesEqual(destinationToken, selectedToken?.address);
}

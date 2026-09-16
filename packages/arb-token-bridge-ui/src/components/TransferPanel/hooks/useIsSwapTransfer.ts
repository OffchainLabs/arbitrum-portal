import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useNetworks } from '../../../hooks/useNetworks';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { isSameTokenSelection } from '../../../util/TokenSelectionUtils';

export function useIsSwapTransfer() {
  const [sourceToken] = useSelectedToken();
  const [{ destinationToken: destinationTokenLookupKey }] = useArbQueryParams();
  const [networks] = useNetworks();

  return !isSameTokenSelection({
    sourceToken,
    destinationTokenLookupKey,
    destinationChainId: networks.destinationChain.id,
  });
}

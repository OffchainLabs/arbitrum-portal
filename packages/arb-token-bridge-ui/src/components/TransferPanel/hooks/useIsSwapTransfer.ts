import { useDestinationSelection } from '../../../hooks/useDestinationToken';

export function useIsSwapTransfer() {
  return useDestinationSelection().isSwap;
}

import { BigNumber } from 'ethers';

import { useBalanceOnDestinationChain } from '../useBalanceOnDestinationChain';
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain';
import { useSelectedToken } from '../useSelectedToken';

export type Balances = {
  sourceBalance: BigNumber | null;
  destinationBalance: BigNumber | null;
};

export function useSelectedTokenBalances(): Balances {
  const [selectedToken] = useSelectedToken();

  return {
    sourceBalance: useBalanceOnSourceChain(selectedToken),
    destinationBalance: useBalanceOnDestinationChain(selectedToken),
  };
}

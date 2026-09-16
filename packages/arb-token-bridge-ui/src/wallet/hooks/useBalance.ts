import { getBalanceClient } from '@wallets';
import { useCallback } from 'react';

import type { FetchBalanceInput } from '../types';

export function useBalance({ chainId }: { chainId: number }) {
  const fetchBalance = useCallback(
    ({ walletAddress, tokenAddresses }: Omit<FetchBalanceInput, 'chainId'>) =>
      getBalanceClient(chainId).fetchBalance({ chainId, walletAddress, tokenAddresses }),
    [chainId],
  );

  return { fetchBalance };
}

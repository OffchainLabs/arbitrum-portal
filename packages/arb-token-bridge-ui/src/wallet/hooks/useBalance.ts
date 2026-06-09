import { useCallback, useMemo } from 'react';

import { ChainId } from '../../types/ChainId';
import { useBalanceContext } from '../providers/BalanceProvider';

type UseBalanceProps = {
  chainId: number;
};

type FetchBalanceArgs = {
  walletAddress: string;
  tokenAddresses: string[];
};

export function useBalance({ chainId }: UseBalanceProps) {
  const evmBalance = useBalanceContext('evm');
  const solanaBalance = useBalanceContext('solana');

  const balanceProvider = useMemo(
    () => (chainId === ChainId.Solana ? solanaBalance : evmBalance),
    [chainId, evmBalance, solanaBalance],
  );

  const fetchBalance = useCallback(
    ({ walletAddress, tokenAddresses }: FetchBalanceArgs) =>
      balanceProvider.fetchBalance({
        chainId,
        walletAddress,
        tokenAddresses,
      }),
    [balanceProvider, chainId],
  );

  return { fetchBalance };
}

import { useCallback, useMemo } from 'react';

import { ChainId } from '../../types/ChainId';
import { useEvmBalanceContext } from '../providers/EvmBalanceProvider';
import { useSolanaBalanceContext } from '../providers/SolanaBalanceProvider';

type UseBalanceProps = {
  chainId: number;
};

type FetchBalanceArgs = {
  walletAddress: string;
  tokenAddresses: string[];
};

export function useBalance({ chainId }: UseBalanceProps) {
  const evmBalance = useEvmBalanceContext();
  const solanaBalance = useSolanaBalanceContext();

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

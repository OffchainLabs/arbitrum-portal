import { useMemo } from 'react';
import useSWR from 'swr';

import { fetchOftFeeEstimate } from '../../services/fetchOftFeeEstimate';
import { isOftTransfer } from '../../services/fetchOftFeeEstimate';
import { useWallets } from '../../wallet/hooks/useWallets';
import { useNetworks } from '../useNetworks';

export function useOftV2FeeEstimates({
  sourceChainErc20Address,
}: {
  sourceChainErc20Address?: string;
}) {
  const { sourceWallet } = useWallets();
  const walletAddress = sourceWallet.account.address;
  const [networks] = useNetworks();

  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;

  const isValidOftTransfer = useMemo(() => {
    return isOftTransfer({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address,
    });
  }, [sourceChainId, destinationChainId, sourceChainErc20Address]);

  const { data: feeEstimates, error } = useSWR(
    [
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address,
      walletAddress,
      isValidOftTransfer,
      'oftFeeEstimates',
    ] as const,
    ([
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _walletAddress,
      _isValidOftTransfer,
    ]) => {
      return fetchOftFeeEstimate([
        _walletAddress,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _isValidOftTransfer,
      ]);
    },
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
    },
  );

  return {
    feeEstimates,
    isLoading: !error && !feeEstimates,
    error: !!error,
  };
}

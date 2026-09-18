import { BigNumber, constants } from 'ethers';
import { useMemo } from 'react';
import useSWR from 'swr';

import { OftV2TransferStarter } from '../../token-bridge-sdk/OftV2TransferStarter';
import { getOftV2TransferConfig } from '../../token-bridge-sdk/oftUtils';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { wagmiConfig } from '../../util/wagmi/setup';
import { useWallets } from '../../wallet/hooks/useWallets';
import { useNetworks } from '../useNetworks';

export function useOftV2FeeEstimates({
  sourceChainErc20Address,
}: {
  sourceChainErc20Address?: string;
}) {
  const {
    sourceWallet: {
      account: { address: walletAddress },
    },
  } = useWallets();
  const [networks] = useNetworks();

  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;

  const isValidOftTransfer = useMemo(() => {
    return getOftV2TransferConfig({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address,
    }).isValid;
  }, [sourceChainId, destinationChainId, sourceChainErc20Address]);

  const { data: feeEstimates, error } = useSWR(
    isValidOftTransfer
      ? {
          sourceChainId,
          destinationChainId,
          sourceChainErc20Address,
          walletAddress,
          key: 'oftFeeEstimates',
        }
      : null,
    async ({ sourceChainId, destinationChainId, sourceChainErc20Address, walletAddress }) => {
      const { estimatedSourceChainFee, estimatedDestinationChainFee } =
        await new OftV2TransferStarter({
          sourceChainProvider: getProviderForChainId(sourceChainId),
          destinationChainProvider: getProviderForChainId(destinationChainId),
          sourceChainErc20Address,
        }).transferEstimateFee({
          amount: BigNumber.from(1),
          from: walletAddress ?? constants.AddressZero,
          wagmiConfig,
        });
      return {
        sourceChainGasFee: BigNumber.from(estimatedSourceChainFee),
        destinationChainGasFee: BigNumber.from(estimatedDestinationChainFee),
      };
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
    isLoading: isValidOftTransfer && !error && !feeEstimates,
    error: !!error,
  };
}

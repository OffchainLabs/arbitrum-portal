import { BigNumber, constants } from 'ethers';
import useSWR from 'swr';
import { useAccount } from 'wagmi';

import { LzValueTransferStarter } from '../../token-bridge-sdk/LzValueTransferStarter';
import { getLzValueTransferConfig } from '../../token-bridge-sdk/lzValueTransferUtils';
import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { useNetworks } from '../useNetworks';

async function fetcher([
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  isValid,
]: [
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  isValid: boolean,
]) {
  if (!isValid || !sourceChainErc20Address) {
    return {
      sourceChainGasFee: BigNumber.from(0),
      destinationChainGasFee: BigNumber.from(0),
    };
  }

  const amount = BigNumber.from(1); // Dust amount for estimation
  const _walletAddress = walletAddress ?? constants.AddressZero;
  const sourceChainProvider = getProviderForChainId(sourceChainId);
  const destinationChainProvider = getProviderForChainId(destinationChainId);

  const { estimatedSourceChainFee, estimatedDestinationChainFee } =
    await new LzValueTransferStarter({
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address,
    }).transferEstimateFee({
      amount,
      from: _walletAddress,
    });

  return {
    sourceChainGasFee: BigNumber.from(estimatedSourceChainFee),
    destinationChainGasFee: BigNumber.from(estimatedDestinationChainFee),
  };
}

export function useLzValueTransferFeeEstimates({
  sourceChainErc20Address,
}: {
  sourceChainErc20Address?: string;
}) {
  const { address: walletAddress } = useAccount();
  const [networks] = useNetworks();

  const sourceChainId = networks.sourceChain.id;
  const destinationChainId = networks.destinationChain.id;

  const isValid = getLzValueTransferConfig({
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address,
  }).isValid;

  const { data: feeEstimates, error } = useSWR(
    [
      walletAddress,
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address,
      isValid,
      'lzValueTransferFeeEstimates',
    ] as const,
    ([_walletAddress, _sourceChainId, _destinationChainId, _sourceChainErc20Address, _isValid]) =>
      fetcher([
        _walletAddress,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _isValid,
      ]),
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

import { useDebounce } from '@uidotdev/usehooks';
import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';

import { DEFAULT_GAS_PRICE_PERCENT_INCREASE } from '@/token-bridge-sdk/Erc20DepositStarter';
import { percentIncrease } from '@/token-bridge-sdk/utils';

import { useAmountBigNumber } from '../../components/TransferPanel/hooks/useAmountBigNumber';
import { DepositGasEstimates } from '../arbTokenBridge.types';
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain';
import { useGasPrice } from '../useGasPrice';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { useSelectedToken } from '../useSelectedToken';
import { useGasEstimates } from './useGasEstimates';

export type GasEstimationStatus =
  | 'loading'
  | 'success'
  | 'error'
  | 'unavailable'
  | 'insufficientBalance';

export type UseGasSummaryResult = {
  status: GasEstimationStatus;
  estimatedParentChainGasFees: number | undefined;
  estimatedChildChainGasFees: number | undefined;
};

export function getGasSummaryStatus({
  amountBigNumber,
  balance,
  gasEstimatesError,
}: {
  amountBigNumber: BigNumber;
  balance: BigNumber | null;
  gasEstimatesError: any;
}): GasEstimationStatus {
  if (balance === null) {
    return 'loading';
  }

  if (amountBigNumber.gt(balance)) {
    return 'insufficientBalance';
  }

  if (gasEstimatesError) {
    return 'error';
  }

  return 'success';
}

export function useGasSummary(): UseGasSummaryResult {
  const [selectedToken] = useSelectedToken();
  const [networks] = useNetworks();
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks);
  const amountBigNumber = useDebounce(useAmountBigNumber(), 300);

  const parentChainGasPrice = useGasPrice({ provider: parentChainProvider });
  const childChainGasPrice = useGasPrice({ provider: childChainProvider });
  const balance = useBalanceOnSourceChain(selectedToken);

  const { gasEstimates: estimateGasResult, error: gasEstimatesError } = useGasEstimates({
    amount: amountBigNumber,
    sourceChainErc20Address: isDepositMode ? selectedToken?.address : selectedToken?.l2Address,
    destinationChainErc20Address: isDepositMode ? selectedToken?.l2Address : selectedToken?.address,
  });

  const estimatedParentChainGasFees = useMemo(() => {
    if (!estimateGasResult?.estimatedParentChainGas) {
      return;
    }
    return parseFloat(
      utils.formatEther(estimateGasResult.estimatedParentChainGas.mul(parentChainGasPrice)),
    );
  }, [estimateGasResult, parentChainGasPrice]);

  const estimatedChildChainGasFees = useMemo(() => {
    if (!estimateGasResult?.estimatedChildChainGas) {
      return;
    }
    if (isDepositMode && 'estimatedChildChainSubmissionCost' in estimateGasResult) {
      return parseFloat(
        utils.formatEther(
          estimateGasResult.estimatedChildChainGas
            .mul(percentIncrease(childChainGasPrice, DEFAULT_GAS_PRICE_PERCENT_INCREASE))
            .add((estimateGasResult as DepositGasEstimates).estimatedChildChainSubmissionCost),
        ),
      );
    }
    return parseFloat(
      utils.formatEther(estimateGasResult.estimatedChildChainGas.mul(childChainGasPrice)),
    );
  }, [childChainGasPrice, estimateGasResult, isDepositMode]);

  const gasSummaryStatus = useMemo(
    () =>
      getGasSummaryStatus({
        amountBigNumber,
        balance,
        gasEstimatesError,
      }),
    [amountBigNumber, balance, gasEstimatesError],
  );

  return {
    status: gasSummaryStatus,
    estimatedParentChainGasFees,
    estimatedChildChainGasFees,
  };
}

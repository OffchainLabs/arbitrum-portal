import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import {
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
} from '@/bridge/components/TransferPanel/useTransferReadinessUtils';
import { formatAmount } from '@/bridge/util/NumberUtils';
import { getNetworkName } from '@/bridge/util/networks';

import { useEarnGasEstimate } from './useEarnGasEstimate';
import type { TransactionStep } from './useTransactionQuote';

export enum EarnTransferReadinessRichErrorMessage {
  GAS_ESTIMATION_FAILURE = 'Gas estimation failed. Please try again.',
  INSUFFICIENT_BALANCE = 'Insufficient balance.',
  INSUFFICIENT_GAS_BALANCE = 'Insufficient balance for gas fees.',
}

export interface UseEarnTransferReadinessParams {
  amount: string;
  amountBalance: BigNumber;
  amountDecimals: number;
  amountSymbol: string;
  nativeBalance?: BigNumber;
  chainId: number;
  transactionSteps: TransactionStep[] | undefined;
  apiGasEstimate?: string;
  enabled?: boolean;
}

export type UseEarnTransferReadinessResult = {
  isReady: boolean;
  errorMessage?: string | EarnTransferReadinessRichErrorMessage;
  isLoading: boolean;
};

function ready(): UseEarnTransferReadinessResult {
  return {
    isReady: true,
    isLoading: false,
  };
}

function notReady(
  params: {
    errorMessage?: string | EarnTransferReadinessRichErrorMessage;
    isLoading?: boolean;
  } = {},
): UseEarnTransferReadinessResult {
  return {
    isReady: false,
    isLoading: params.isLoading ?? false,
    ...params,
  };
}

export function useEarnTransferReadiness({
  amount,
  amountBalance,
  amountDecimals,
  amountSymbol,
  nativeBalance,
  chainId,
  transactionSteps,
  apiGasEstimate,
  enabled = true,
}: UseEarnTransferReadinessParams): UseEarnTransferReadinessResult {
  const { address: walletAddress, isConnected } = useAccount();

  const gasEstimate = useEarnGasEstimate({
    transactionSteps,
    chainId,
    walletAddress: walletAddress || undefined,
    apiEstimate: apiGasEstimate,
    enabled: enabled && isConnected && !!walletAddress && chainId !== 0,
  });

  return useMemo(() => {
    if (isConnected && walletAddress) {
      const earlyAmountNum = parseFloat(amount || '0');
      if (earlyAmountNum > 0) {
        const amountBalanceFloat = parseFloat(utils.formatUnits(amountBalance, amountDecimals));
        if (earlyAmountNum > amountBalanceFloat) {
          return notReady({
            errorMessage: getInsufficientFundsErrorMessage({
              asset: amountSymbol,
              chain: getNetworkName(chainId),
            }),
          });
        }
      }
    }

    if (!enabled) {
      return ready();
    }

    if (!isConnected || !walletAddress) {
      return notReady();
    }

    const amountNum = parseFloat(amount || '0');
    if (isNaN(amountNum) || amountNum <= 0) {
      return notReady();
    }

    if (!transactionSteps || transactionSteps.length === 0) {
      return notReady();
    }

    if (gasEstimate.isLoading) {
      return notReady({ isLoading: true });
    }

    if (gasEstimate.error && !apiGasEstimate && !gasEstimate.estimate) {
      return notReady({
        errorMessage: EarnTransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE,
      });
    }

    // ToS is checked in the submit handler to avoid deadlocking a disabled button flow.
    const amountBalanceFloat = parseFloat(utils.formatUnits(amountBalance, amountDecimals));
    const nativeBalanceFloat = nativeBalance ? parseFloat(utils.formatEther(nativeBalance)) : null;

    if (amountNum > amountBalanceFloat) {
      return notReady({
        errorMessage: getInsufficientFundsErrorMessage({
          asset: amountSymbol,
          chain: getNetworkName(chainId),
        }),
      });
    }

    if (gasEstimate.estimate && nativeBalanceFloat !== null) {
      const gasFeeEth = parseFloat(gasEstimate.estimate.eth);
      const isNativeAsset = amountSymbol.toUpperCase() === 'ETH';

      if (isNativeAsset) {
        const requiredEth = amountNum + gasFeeEth;
        if (requiredEth > nativeBalanceFloat) {
          return notReady({
            errorMessage: getInsufficientFundsForGasFeesErrorMessage({
              asset: 'ETH',
              chain: getNetworkName(chainId),
              balance: formatAmount(nativeBalance, { decimals: 18, symbol: 'ETH' }),
              requiredBalance: `${requiredEth} ETH`,
            }),
          });
        }
      }

      if (gasFeeEth > nativeBalanceFloat) {
        return notReady({
          errorMessage: getInsufficientFundsForGasFeesErrorMessage({
            asset: 'ETH',
            chain: getNetworkName(chainId),
            balance: formatAmount(nativeBalance, { decimals: 18, symbol: 'ETH' }),
            requiredBalance: `${gasEstimate.estimate.eth} ETH`,
          }),
        });
      }
    }

    return ready();
  }, [
    enabled,
    isConnected,
    walletAddress,
    amount,
    amountBalance,
    amountDecimals,
    amountSymbol,
    nativeBalance,
    chainId,
    transactionSteps,
    apiGasEstimate,
    gasEstimate.isLoading,
    gasEstimate.error,
    gasEstimate.estimate,
  ]);
}

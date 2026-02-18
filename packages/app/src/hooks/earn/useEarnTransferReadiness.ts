import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { formatAmount } from '@/bridge/util/NumberUtils';
import { getNetworkName } from '@/bridge/util/networks';

import { useEarnGasEstimate } from './useEarnGasEstimate';
import {
  EarnTransferReadinessRichErrorMessage,
  getInsufficientFundsErrorMessage,
  getInsufficientFundsForGasFeesErrorMessage,
} from './useEarnTransferReadinessUtils';
import type { TransactionStep } from './useTransactionQuote';

export interface UseEarnTransferReadinessParams {
  amount: string;
  amountBalance: BigNumber; // Balance of the token being sent (in raw units)
  amountDecimals: number;
  amountSymbol: string;
  nativeBalance?: BigNumber; // Native currency balance (ETH) for gas fees (in wei)
  chainId: number;
  transactionSteps: TransactionStep[] | undefined;
  apiGasEstimate?: string; // Optional API-provided gas estimate
  enabled?: boolean; // Whether to enable readiness checks
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

/**
 * Hook to check if an earn transaction is ready to be executed
 * Validates amount, balance, gas estimation, and ToS acceptance
 */
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
    // When wallet is connected, always check balance even if hook is "disabled" (no transaction quote yet)
    // This ensures button is disabled when balance is exceeded, even before we have a quote
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

    // If hook is disabled (no transaction quote yet), return ready() to allow preview
    // Balance check already done above for connected wallets
    if (!enabled) {
      return ready();
    }

    // Check if wallet is connected (for enabled hook)
    if (!isConnected || !walletAddress) {
      return notReady();
    }

    // Check if amount is valid
    const amountNum = parseFloat(amount || '0');
    if (isNaN(amountNum) || amountNum <= 0) {
      return notReady();
    }

    // Check if transaction quote exists
    if (!transactionSteps || transactionSteps.length === 0) {
      return notReady();
    }

    // Check gas estimation status early - this is independent of amount/balance validation
    // Gas estimation errors should be shown even if other validations fail
    if (gasEstimate.isLoading) {
      return notReady({ isLoading: true });
    }

    // Only treat gas estimation errors as blocking if there's no API fallback estimate
    // Allowance errors are handled gracefully and don't block the transaction
    // If we have an API estimate, we can proceed even if onchain estimation failed
    if (gasEstimate.error && !apiGasEstimate && !gasEstimate.estimate) {
      return notReady({
        errorMessage: EarnTransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE,
      });
    }

    // Note: ToS acceptance is NOT checked here to avoid a race condition:
    // - Button is disabled when transfer is not ready
    // - ToS popup is shown when button is clicked
    // - If ToS blocks readiness, button stays disabled and user can't accept ToS
    // ToS is checked in the transaction handler instead (checkAndShowToS)

    // Convert balances to numbers for comparison
    const amountBalanceFloat = parseFloat(utils.formatUnits(amountBalance, amountDecimals));
    const nativeBalanceFloat = nativeBalance ? parseFloat(utils.formatEther(nativeBalance)) : null;

    // Check if amount exceeds balance
    if (amountNum > amountBalanceFloat) {
      return notReady({
        errorMessage: getInsufficientFundsErrorMessage({
          asset: amountSymbol,
          chain: getNetworkName(chainId),
        }),
      });
    }

    // Check if gas fee exceeds native balance
    if (gasEstimate.estimate && nativeBalanceFloat !== null) {
      const gasFeeEth = parseFloat(gasEstimate.estimate.eth);
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

    // If we have a gas estimate but no native balance, we can't verify gas sufficiency
    // This is acceptable - the transaction will fail on-chain if there's not enough gas
    // But we should still allow the user to proceed if amount is valid

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

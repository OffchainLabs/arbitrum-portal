import type { TransactionParameters } from '@lifi/sdk';
import { useCallback } from 'react';
import { useConfig } from 'wagmi';

import type { LifiMergedTransaction } from '../state/app/state';
import { WithdrawalStatus } from '../state/app/state';
import { resumeLifiRoute } from '../token-bridge-sdk/LifiRouteExecutor';
import { addressesEqual } from '../util/AddressUtils';
import { isLifiRouteComplete } from '../util/LifiTransactionStatus';
import { isUserRejectedError } from '../util/isUserRejectedError';
import { useWalletForChain } from '../wallet/hooks/useWallets';
import { useLifiMergedTransactionCacheStore } from './useLifiMergedTransactionCacheStore';
import { useSwitchNetworkWithConfig } from './useSwitchNetworkWithConfig';
import type { UseTransactionHistoryResult } from './useTransactionHistory';

export function useLifiHistoryActions(
  tx: LifiMergedTransaction,
  updateTransaction?: UseTransactionHistoryResult['updateTransaction'],
) {
  const wallet = useWalletForChain(tx.sourceChainId);
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchNetworkWithConfig();
  const updateLifiTransactionInCache = useLifiMergedTransactionCacheStore(
    (state) => state.updateTransaction,
  );

  const resume = useCallback(
    async (onApprovalRequest: (approvalRequest: TransactionParameters) => Promise<boolean>) => {
      if (!tx.lifiRoute) {
        return;
      }

      try {
        await resumeLifiRoute(tx.lifiRoute, {
          wagmiConfig,
          switchChainAsync,
          onApprovalRequest,
          onRouteUpdate: (lifiRoute) => {
            const transactionUpdates = {
              lifiRoute,
              ...(isLifiRouteComplete(lifiRoute)
                ? {
                    status: WithdrawalStatus.CONFIRMED,
                    destinationStatus: WithdrawalStatus.CONFIRMED,
                  }
                : tx.destinationStatus === WithdrawalStatus.FAILURE &&
                    !lifiRoute.steps.some((step) => step.execution?.status === 'FAILED')
                  ? { destinationStatus: WithdrawalStatus.UNCONFIRMED }
                  : {}),
            };

            if (updateTransaction) {
              updateTransaction({ ...tx, ...transactionUpdates });
              return;
            }

            updateLifiTransactionInCache(tx, transactionUpdates);
          },
        });
      } catch (error) {
        if (isUserRejectedError(error)) {
          return;
        }
        throw error;
      }
    },
    [switchChainAsync, tx, updateLifiTransactionInCache, updateTransaction, wagmiConfig],
  );

  return {
    isConnected: wallet.isConnected,
    isSender: Boolean(
      wallet.account.address && tx.sender && addressesEqual(wallet.account.address, tx.sender),
    ),
    resume,
  };
}

import { ParentToChildMessageStatus } from '@arbitrum/sdk';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { errorToast } from '../components/common/atoms/Toast';
import { DepositStatus, MergedTransaction } from '../state/app/state';
import { Address } from '../util/AddressUtils';
import { trackEvent } from '../util/AnalyticsUtils';
import { getRetryableTicket } from '../util/RetryableUtils';
import { isUserRejectedError } from '../util/isUserRejectedError';
import { getNetworkName } from '../util/networks';
import { useWalletContext } from '../wallet/WalletContext';
import { useTransactionHistory } from './useTransactionHistory';

export type UseRedeemRetryableResult = {
  redeem: () => Promise<void>;
  isRedeeming: boolean;
};

export function useRedeemRetryable(
  tx: MergedTransaction,
  address: Address | undefined,
): UseRedeemRetryableResult {
  const { signer: evmSigner } = useWalletContext('evm');
  const { updatePendingTransaction } = useTransactionHistory(address);

  const destinationNetworkName = getNetworkName(tx.destinationChainId);

  const [isRedeeming, setIsRedeeming] = useState(false);

  const redeem = useCallback(async () => {
    if (isRedeeming) {
      return;
    }
    try {
      setIsRedeeming(true);

      const signer = await evmSigner.getEthersSigner(tx.destinationChainId);

      const retryableTicket = await getRetryableTicket({
        parentChainTxHash: tx.txId,
        retryableCreationId: tx.parentToChildMsgData?.retryableCreationTxID,
        parentChainProvider: getProviderForChainId(tx.parentChainId),
        childChainSigner: signer,
      });

      const redeemTx = await retryableTicket.redeem();
      await redeemTx.wait();

      const status = await retryableTicket.status();
      const isSuccess = status === ParentToChildMessageStatus.REDEEMED;
      const successfulRedeem = await retryableTicket.getSuccessfulRedeem();

      if (successfulRedeem.status !== ParentToChildMessageStatus.REDEEMED) {
        throw new Error(
          `Unexpected status for retryable ticket (parent tx hash ${tx.txId}), expected ${ParentToChildMessageStatus.REDEEMED} but got ${successfulRedeem.status}`,
        );
      }

      await updatePendingTransaction({
        ...tx,
        parentToChildMsgData: {
          childTxId: successfulRedeem.childTxReceipt.transactionHash,
          status,
          retryableCreationTxID: retryableTicket.retryableCreationId,
          fetchingUpdate: false,
        },
        resolvedAt: isSuccess ? dayjs().valueOf() : null,
        depositStatus: isSuccess ? DepositStatus.L2_SUCCESS : tx.depositStatus,
      });

      // track in analytics
      trackEvent('Redeem Retryable', { network: destinationNetworkName });
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return;
      }
      return errorToast(`There was an error, here is more information: ${error.message}`);
    } finally {
      setIsRedeeming(false);
    }
  }, [isRedeeming, destinationNetworkName, evmSigner, tx, updatePendingTransaction]);

  return { redeem, isRedeeming };
}

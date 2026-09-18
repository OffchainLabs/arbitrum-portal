import { useCallback } from 'react';

import { useTransactionHistoryAddressStore } from '../components/TransactionHistory/TransactionHistorySearchBar';
import { errorToast } from '../components/common/atoms/Toast';
import { GET_HELP_LINK } from '../constants';
import { getTransactionType } from '../services/history';
import type { MergedTransaction } from '../state/app/state';
import { isDepositReadyToRedeem } from '../state/app/utils';
import { useClaimCctp } from '../state/cctpState';
import { addressesEqual, isValidAddressForChain } from '../util/AddressUtils';
import { trackEvent } from '../util/AnalyticsUtils';
import { sanitizeTokenSymbol } from '../util/TokenUtils';
import { formatTransactionError, isUserRejectedError } from '../util/isUserRejectedError';
import { getNetworkName } from '../util/networks';
import { useWalletForChain } from '../wallet/hooks/useWallets';
import { useClaimWithdrawal } from './useClaimWithdrawal';
import { useRedeemRetryable } from './useRedeemRetryable';
import { useSwitchNetworkWithConfig } from './useSwitchNetworkWithConfig';

export function useCanonicalHistoryActions(
  tx: MergedTransaction,
  type: 'deposits' | 'withdrawals',
) {
  const actionChainId = isDepositReadyToRedeem(tx) ? tx.childChainId : tx.destinationChainId;
  const wallet = useWalletForChain(actionChainId);
  const chainId = wallet.account.chainId;
  const connectedAddress = wallet.account.address;
  const isConnected = wallet.isConnected;
  const { switchChainAsync } = useSwitchNetworkWithConfig();
  const networkName = getNetworkName(chainId ?? 0);
  const searchedAddress = useTransactionHistoryAddressStore((state) => state.sanitizedAddress);
  const actionAddress = isValidAddressForChain(searchedAddress, actionChainId)
    ? searchedAddress
    : undefined;

  const isViewingAnotherAddress = Boolean(
    connectedAddress && searchedAddress && !addressesEqual(connectedAddress, searchedAddress),
  );

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId,
  });

  const { claim, isClaiming } = useClaimWithdrawal(tx);
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx);
  const { redeem, isRedeeming } = useRedeemRetryable(tx, actionAddress);

  const isConnectedToCorrectNetworkForAction = isDepositReadyToRedeem(tx)
    ? chainId === tx.childChainId // for redemption actions, we connect to the child chain
    : chainId === tx.destinationChainId; // for claims, we need to be on the destination chain

  const handleRedeemRetryable = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchChainAsync({ chainId: tx.childChainId });
      }

      await redeem();
    } catch (error) {
      if (isUserRejectedError(error)) {
        return;
      }
      errorToast(`Can't retry the deposit: ${formatTransactionError(error)}`);
    }
  }, [tx, isConnectedToCorrectNetworkForAction, redeem, switchChainAsync]);

  const handleClaim = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchChainAsync({ chainId: tx.destinationChainId });
      }

      if (tx.isCctp) {
        return await claimCctp();
      } else {
        return await claim();
      }
    } catch (error) {
      if (isUserRejectedError(error)) {
        return;
      }

      errorToast(
        `Can't claim ${type === 'deposits' ? 'deposit' : 'withdrawal'}: ${formatTransactionError(error)}`,
      );
    }
  }, [claim, claimCctp, isConnectedToCorrectNetworkForAction, switchChainAsync, tx, type]);

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank');

    // track the button click
    trackEvent('Tx Error: Get Help Click', {
      network: networkName,
      transactionType: getTransactionType(tx),
    });
  };

  return {
    isConnected,
    isRedeeming,
    handleRedeemRetryable,
    isClaiming,
    isClaimingCctp,
    isViewingAnotherAddress,
    searchedAddress,
    tokenSymbol,
    handleClaim,
    getHelpOnError,
  };
}

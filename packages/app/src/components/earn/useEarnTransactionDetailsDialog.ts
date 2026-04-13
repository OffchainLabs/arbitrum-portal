'use client';

import { useCallback, useState } from 'react';

import type { TransactionDetails } from './EarnTransactionDetailsPopup';

export function useEarnTransactionDetailsDialog() {
  const [txDetailsIsOpen, setTxDetailsIsOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [txDetailsIsLoading, setTxDetailsIsLoading] = useState(true);

  const showTransactionDetails = useCallback(
    (details: TransactionDetails, isCompleted: boolean = false) => {
      setTransactionDetails(details);
      setTxDetailsIsLoading(!isCompleted && !details.txHash);
      setTxDetailsIsOpen(true);
    },
    [],
  );

  const closeTransactionDetails = useCallback(() => {
    setTxDetailsIsOpen(false);
    const timer = setTimeout(() => {
      setTransactionDetails(null);
      setTxDetailsIsLoading(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return {
    txDetailsIsOpen,
    transactionDetails,
    txDetailsIsLoading,
    showTransactionDetails,
    closeTransactionDetails,
  };
}

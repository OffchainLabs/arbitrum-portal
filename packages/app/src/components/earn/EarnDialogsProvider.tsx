'use client';

import { useLocalStorage } from '@rehooks/local-storage';
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { EARN_TOS_LOCALSTORAGE_KEY } from '@/app-lib/earn/constants';
import { DialogWrapper, useDialog2 } from '@/bridge/components/common/Dialog2';

import { EarnToSPopupDialog } from './EarnToSPopupDialog';
import { EarnTransactionDetailsPopup, TransactionDetails } from './EarnTransactionDetailsPopup';

interface EarnDialogsContextValue {
  checkAndShowToS: () => Promise<boolean>;

  showTransactionDetails: (details: TransactionDetails, isCompleted?: boolean) => void;
}

const EarnDialogsContext = createContext<EarnDialogsContextValue | null>(null);

export function useEarnDialogs() {
  const context = useContext(EarnDialogsContext);
  if (!context) {
    throw new Error('useEarnDialogs must be used within EarnDialogsProvider');
  }
  return context;
}

export function EarnDialogsProvider({ children }: PropsWithChildren) {
  const [tosAccepted, setTosAccepted] = useLocalStorage<boolean>(EARN_TOS_LOCALSTORAGE_KEY, false);
  const [tosDialogProps, tosOpenDialog] = useDialog2();

  const [txDetailsIsOpen, setTxDetailsIsOpen] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [txDetailsIsLoading, setTxDetailsIsLoading] = useState(true);

  const checkAndShowToS = useCallback(async (): Promise<boolean> => {
    if (tosAccepted) {
      return true;
    }

    const waitForInput = tosOpenDialog('earn_tos');
    const [confirmed, onCloseData] = await waitForInput();

    if (
      confirmed &&
      onCloseData &&
      typeof onCloseData === 'object' &&
      'tosAccepted' in onCloseData
    ) {
      setTosAccepted(true);
      return true;
    }

    return false;
  }, [tosAccepted, tosOpenDialog, setTosAccepted]);

  const showTransactionDetails = useCallback(
    (details: TransactionDetails, isCompleted: boolean = false) => {
      setTransactionDetails(details);
      setTxDetailsIsLoading(!isCompleted && !details.txHash);
      setTxDetailsIsOpen(true);
    },
    [],
  );

  const closeTxDetailsDialog = useCallback(() => {
    setTxDetailsIsOpen(false);
    setTimeout(() => {
      setTransactionDetails(null);
      setTxDetailsIsLoading(true);
    }, 300);
  }, []);

  const value = useMemo(
    () => ({
      checkAndShowToS,
      showTransactionDetails,
    }),
    [checkAndShowToS, showTransactionDetails],
  );

  return (
    <EarnDialogsContext.Provider value={value}>
      {children}
      {tosDialogProps.openedDialogType === 'earn_tos' ? (
        <EarnToSPopupDialog {...tosDialogProps} isOpen />
      ) : (
        <DialogWrapper {...tosDialogProps} />
      )}
      <EarnTransactionDetailsPopup
        isOpen={txDetailsIsOpen}
        onClose={closeTxDetailsDialog}
        transactionDetails={transactionDetails}
        isLoading={txDetailsIsLoading}
      />
    </EarnDialogsContext.Provider>
  );
}

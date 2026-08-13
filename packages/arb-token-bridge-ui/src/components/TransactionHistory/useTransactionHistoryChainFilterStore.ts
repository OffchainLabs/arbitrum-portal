import { create } from 'zustand';

import { TxHistoryChainSelection } from '../../util/chainFilter';

type TransactionHistoryChainFilterStore = {
  // The user's explicit filter selection. `null` means the user hasn't touched
  // the filter: the effective selection then defaults to "All Core Chains" —
  // see `resolveChainFilter` / `useTxHistoryChainFilter`.
  // The default is never written here, so it can't race the initial fetch.
  selection: TxHistoryChainSelection | null;
  // The pair-default chain id active when the selection was made. A later
  // pair change to a different longtail chain makes the selection stale, so
  // history follows the new pair — see `useTxHistoryChainFilter`.
  selectionDefaultChainId: number | undefined;
  setSelection: (selection: TxHistoryChainSelection, defaultChainId?: number) => void;
};

export const useTransactionHistoryChainFilterStore = create<TransactionHistoryChainFilterStore>(
  (set) => ({
    selection: null,
    selectionDefaultChainId: undefined,
    setSelection: (selection: TxHistoryChainSelection, defaultChainId?: number) =>
      set({ selection, selectionDefaultChainId: defaultChainId }),
  }),
);

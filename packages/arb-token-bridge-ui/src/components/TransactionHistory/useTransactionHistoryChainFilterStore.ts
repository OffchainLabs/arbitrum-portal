import { create } from 'zustand';

import { TxHistoryChainSelection } from '../../util/chainFilter';

type TransactionHistoryChainFilterStore = {
  // The user's explicit filter selection. `null` means the user hasn't touched
  // the filter: the effective selection then defaults to "All Core Chains" —
  // see `resolveChainFilter` / `useTxHistoryChainFilter`.
  // The default is never written here, so it can't race the initial fetch.
  selection: TxHistoryChainSelection | null;
  setSelection: (selection: TxHistoryChainSelection) => void;
};

export const useTransactionHistoryChainFilterStore = create<TransactionHistoryChainFilterStore>(
  (set) => ({
    selection: null,
    setSelection: (selection: TxHistoryChainSelection) => set({ selection }),
  }),
);

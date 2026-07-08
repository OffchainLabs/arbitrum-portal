import { create } from 'zustand';

import { TxHistoryChainSelection } from '../../util/chainFilter';

type TransactionHistoryChainFilterStore = {
  // The user's explicit filter selection, tagged with the testnet mode it was
  // made in. `null` means the user hasn't touched the filter, in which case the
  // effective selection is derived from the bridge's selected pair — see
  // `resolveSelectedChainIds` and `useSelectedChainIds`. Because the default is
  // derived at read time (never written here), it can't race the initial fetch
  // and re-defaults automatically when the bridge pair or testnet mode changes.
  selection: TxHistoryChainSelection | null;
  setSelection: (selection: TxHistoryChainSelection) => void;
};

export const useTransactionHistoryChainFilterStore = create<TransactionHistoryChainFilterStore>(
  (set) => ({
    selection: null,
    setSelection: (selection: TxHistoryChainSelection) => set({ selection }),
  }),
);

import { createContext, useContext } from 'react';

import type { WalletHandle } from '../types';

const defaultEvmWalletContextValue: WalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: undefined,
    chain: undefined,
    status: 'disconnected',
  },
  isConnected: false,
  disconnect: async () => {},
};

export const EvmWalletContext = createContext<WalletHandle>(defaultEvmWalletContextValue);

export function useEvmWalletContext() {
  return useContext(EvmWalletContext);
}

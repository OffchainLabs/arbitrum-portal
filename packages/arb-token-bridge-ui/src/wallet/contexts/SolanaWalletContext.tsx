import { createContext, useContext } from 'react';

import { ChainId } from '../../types/ChainId';
import type { WalletHandle } from '../types';

export const defaultSolanaWalletContextValue: WalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: undefined,
    chain: { id: ChainId.Solana },
    status: 'disconnected',
  },
  isConnected: false,
  disconnect: async () => {},
};

export const SolanaWalletContext = createContext<WalletHandle>(defaultSolanaWalletContextValue);

export function useSolanaWalletContext() {
  return useContext(SolanaWalletContext);
}

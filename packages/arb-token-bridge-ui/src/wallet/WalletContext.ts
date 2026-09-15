import { createContext, useContext } from 'react';

import type { WalletContextValue, WalletEcosystem } from './types';

export const defaultWalletContextValue: WalletContextValue = {
  evm: {
    ecosystem: 'evm',
    account: { ecosystem: 'evm', status: 'disconnected' },
    isConnected: false,
    disconnect: async () => {},
  },
  solana: {
    ecosystem: 'solana',
    account: { ecosystem: 'solana', status: 'disconnected' },
    isConnected: false,
    disconnect: async () => {},
  },
};

export const WalletContext = createContext<WalletContextValue>(defaultWalletContextValue);

export function useWalletContext<Ecosystem extends WalletEcosystem>(
  ecosystem: Ecosystem,
): WalletContextValue[Ecosystem] {
  return useContext(WalletContext)[ecosystem];
}

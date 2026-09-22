import { createContext, useContext } from 'react';

import { createSolanaSigner } from './solana/signer';
import type { WalletContextValue, WalletEcosystem } from './types';

export const defaultWalletContextValue: WalletContextValue = {
  evm: {
    ecosystem: 'evm',
    account: { ecosystem: 'evm', status: 'disconnected' },
    isConnected: false,
    disconnect: async () => {},
    signer: {
      getAddress: () => undefined,
      getWalletClient: async () => {
        throw new Error('Connect a wallet to continue.');
      },
    },
  },
  solana: {
    ecosystem: 'solana',
    account: { ecosystem: 'solana', status: 'disconnected' },
    isConnected: false,
    disconnect: async () => {},
    signer: createSolanaSigner(() => undefined),
  },
};

export const WalletContext = createContext<WalletContextValue>(defaultWalletContextValue);

export function useWalletContext<Ecosystem extends WalletEcosystem>(
  ecosystem: Ecosystem,
): WalletContextValue[Ecosystem] {
  return useContext(WalletContext)[ecosystem];
}

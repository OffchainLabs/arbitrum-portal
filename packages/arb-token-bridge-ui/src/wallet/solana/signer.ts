import type { Provider as SolanaWalletProvider } from '@reown/appkit-adapter-solana/react';

import type { SolanaSigner, SolanaWalletAdapter } from '../types';

// LiFi's Solana executor only reads `publicKey` and calls `signTransaction`, then sends and
// confirms the signed transaction through its own connections.
export function createSolanaSigner(
  getProvider: () => SolanaWalletProvider | undefined,
): SolanaSigner {
  return {
    getAddress: () => getProvider()?.publicKey?.toBase58(),
    getWalletAdapter: async () => {
      const provider = getProvider();
      if (!provider?.publicKey) {
        throw new Error('Connect a Solana wallet to continue.');
      }
      const adapter: Pick<SolanaWalletAdapter, 'publicKey' | 'signTransaction'> = {
        publicKey: provider.publicKey,
        signTransaction: (transaction) => provider.signTransaction(transaction),
      };
      return adapter as SolanaWalletAdapter;
    },
  };
}

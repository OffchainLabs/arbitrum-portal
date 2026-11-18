import type { Provider as SolanaWalletProvider } from '@reown/appkit-adapter-solana/react';

import type { SolanaSigner, SolanaWalletAdapter } from '../types';

// LiFi's Solana executor only reads `publicKey` and calls `signTransaction`, then sends and
// confirms the signed transaction through its own connections.
export function createSolanaSigner(
  getProvider: () => SolanaWalletProvider | undefined,
): SolanaSigner {
  const getConnectedProvider = () => {
    const provider = getProvider();
    if (!provider?.publicKey) {
      throw new Error('Connect a Solana wallet to continue.');
    }
    return { provider, publicKey: provider.publicKey };
  };

  return {
    getAddress: () => getProvider()?.publicKey?.toBase58(),
    getWalletAdapter: async () => {
      getConnectedProvider();
      // LiFi keeps the adapter for a whole step, so read the wallet on each access.
      // After a wallet switch, LiFi's address check fails instead of signing with the old wallet.
      const adapter: Pick<SolanaWalletAdapter, 'publicKey' | 'signTransaction'> = {
        get publicKey() {
          return getConnectedProvider().publicKey;
        },
        signTransaction: (transaction) =>
          getConnectedProvider().provider.signTransaction(transaction),
      };
      return adapter as SolanaWalletAdapter;
    },
  };
}

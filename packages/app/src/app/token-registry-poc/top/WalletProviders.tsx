'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { WagmiProvider, useAccount } from 'wagmi';

import { appKit, wagmiConfig } from '@/bridge/util/wagmi/setup';

const queryClient = new QueryClient();

// The PoC page sits outside the app shell, so it brings its own wallet providers.
export function WalletProviders({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

// The app and bridge packages each get their own copy of @reown/appkit, and createAppKit only
// sets up the bridge's. The app's useAppKit hook would throw, so the button calls the bridge's
// instance, like the bridge's useWalletModal.
export function WalletButton() {
  const { address } = useAccount();

  return (
    <button
      onClick={() =>
        void appKit.open(address ? { view: 'Account' } : { view: 'Connect', namespace: 'eip155' })
      }
      className="shrink-0 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
    >
      {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Connect wallet'}
    </button>
  );
}

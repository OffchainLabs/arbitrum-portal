'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { WagmiProvider } from 'wagmi';

import { wagmiConfig } from '@/bridge/util/wagmi/setup';

const queryClient = new QueryClient();

// The PoC page sits outside the app shell, so it brings its own wallet providers.
export function WalletProviders({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

'use client';

import { createConfig } from '@lifi/sdk';
import { RainbowKitProvider, Theme, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NextAdapterApp from 'next-query-params/app';
import merge from 'lodash-es/merge';
import { createOvermind } from 'overmind';
import { Provider as OvermindProvider } from 'overmind-react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { PropsWithChildren, ReactNode, Suspense, useEffect, useMemo, useState } from 'react';
import { QueryParamProvider } from 'use-query-params';
import { WagmiProvider } from 'wagmi';

import { LIFI_INTEGRATOR_IDS } from '@/bridge/app/api/crosschain-transfers/lifi';
import { ArbQueryParamProvider } from '@/bridge/hooks/useArbQueryParams';
import { config } from '@/bridge/state';
import { AppContextProvider } from '@/bridge/components/App/AppContext';
import { getProps } from './wagmi/setup';

// Initialize PostHog
if (typeof window !== 'undefined' && typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV !== 'production') {
        posthog.debug();
      }
    },
    persistence: 'memory',
    autocapture: false,
    disable_session_recording: true,
  });
}

// RainbowKit theme
const rainbowkitTheme = merge(darkTheme(), {
  colors: {
    accentColor: 'var(--blue-link)',
  },
  fonts: {
    body: 'Roboto, sans-serif',
  },
} as Theme);

// Wagmi config setup - use a function to get config on client-side only
function getWagmiConfig() {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const targetChainKey = searchParams.get('sourceChain') || null;
  return getProps(targetChainKey);
}

const integratorId =
  typeof window !== 'undefined' && window.location.pathname === '/bridge/embed'
    ? LIFI_INTEGRATOR_IDS.EMBED
    : LIFI_INTEGRATOR_IDS.NORMAL;

// Clear WalletConnect cache
if (typeof window !== 'undefined') {
  Object.keys(localStorage).forEach((key) => {
    if (key === 'wagmi.requestedChains' || key === 'wagmi.store' || key.startsWith('wc@2')) {
      localStorage.removeItem(key);
    }
  });
}

const queryClient = new QueryClient();

// Initialize LiFi config
if (typeof window !== 'undefined') {
  createConfig({ integrator: integratorId });
}

// NavigationProviders - Consolidated providers wrapper
// Phase 3: All providers added
export function NavigationProviders({ children }: PropsWithChildren) {
  const overmind = useMemo(() => createOvermind(config), []);
  const [wagmiConfig, setWagmiConfig] = useState<ReturnType<typeof getWagmiConfig>>(null);

  // Get wagmi config on client-side only
  useEffect(() => {
    const config = getWagmiConfig();
    if (config) {
      setWagmiConfig(config);
    }
  }, []);

  // If wagmi config is not available (SSR or not yet loaded), return children without wallet providers
  // NavWallet component handles this with its own mounted check
  if (!wagmiConfig) {
    return (
      <Suspense>
        <OvermindProvider value={overmind}>
          <PostHogProvider client={posthog}>
            <QueryParamProvider adapter={NextAdapterApp} options={{ updateType: 'replaceIn', removeDefaultsFromUrl: true }}>
              <ArbQueryParamProvider>
                <QueryClientProvider client={queryClient}>
                  {children}
                </QueryClientProvider>
              </ArbQueryParamProvider>
            </QueryParamProvider>
          </PostHogProvider>
        </OvermindProvider>
      </Suspense>
    );
  }

  return (
    <Suspense>
      <OvermindProvider value={overmind}>
        <PostHogProvider client={posthog}>
          <QueryParamProvider adapter={NextAdapterApp} options={{ updateType: 'replaceIn', removeDefaultsFromUrl: true }}>
            <ArbQueryParamProvider>
              <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                  <RainbowKitProvider theme={rainbowkitTheme}>
                    <AppContextProvider>{children}</AppContextProvider>
                  </RainbowKitProvider>
                </QueryClientProvider>
              </WagmiProvider>
            </ArbQueryParamProvider>
          </QueryParamProvider>
        </PostHogProvider>
      </OvermindProvider>
    </Suspense>
  );
}

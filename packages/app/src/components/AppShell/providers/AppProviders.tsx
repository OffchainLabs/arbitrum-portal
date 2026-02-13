import { createConfig } from '@lifi/sdk';
import { RainbowKitProvider, Theme, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import merge from 'lodash-es/merge';
import { createOvermind } from 'overmind';
import { Provider as OvermindProvider } from 'overmind-react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { PropsWithChildren, useMemo } from 'react';
import { WagmiProvider } from 'wagmi';

import { LIFI_INTEGRATOR_IDS } from '@/bridge/app/api/crosschain-transfers/lifi';
import { AppContextProvider } from '@/bridge/components/App/AppContext';
import { ArbQueryParamProvider } from '@/bridge/hooks/useArbQueryParams';
import { config } from '@/bridge/state';

import { getProps } from './wagmi/setup';

if (typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string') {
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

const rainbowkitTheme = merge(darkTheme(), {
  colors: {
    accentColor: 'var(--blue-link)',
  },
  fonts: {
    body: 'Roboto, sans-serif',
  },
} as Theme);

// We're doing this as a workaround so users can select their preferred chain on WalletConnect.
//
// https://github.com/orgs/WalletConnect/discussions/2733
// https://github.com/wagmi-dev/references/blob/main/packages/connectors/src/walletConnect.ts#L114
const searchParams = new URLSearchParams(window.location.search);
const targetChainKey = searchParams.get('sourceChain');

const integratorId =
  window.location.pathname === '/bridge/embed'
    ? LIFI_INTEGRATOR_IDS.EMBED
    : LIFI_INTEGRATOR_IDS.NORMAL;

const wagmiConfig = getProps(targetChainKey);

// Clear cache for everything related to WalletConnect v2.
//
// TODO: Remove this once the fix for the infinite loop / memory leak is identified.
Object.keys(localStorage).forEach((key) => {
  if (key === 'wagmi.requestedChains' || key === 'wagmi.store' || key.startsWith('wc@2')) {
    localStorage.removeItem(key);
  }
});

const queryClient = new QueryClient();

createConfig({ integrator: integratorId });

export function AppProviders({ children }: PropsWithChildren) {
  const overmind = useMemo(() => createOvermind(config), []);

  return (
    <OvermindProvider value={overmind}>
      <PostHogProvider client={posthog}>
        <ArbQueryParamProvider>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider theme={rainbowkitTheme}>
                <AppContextProvider>{children}</AppContextProvider>
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </ArbQueryParamProvider>
      </PostHogProvider>
    </OvermindProvider>
  );
}

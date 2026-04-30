'use client';

import { createConfig } from '@lifi/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { isE2eTestingEnvironment, isProductionEnvironment } from '@/bridge/util/CommonUtils';
import { registerLocalNetwork } from '@/bridge/util/networks';
import { wagmiConfig } from '@/bridge/util/wagmi/setup';

import { initializeDayjs } from '../../../initialization';

if (typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    cookieless_mode: 'always',
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

const integratorId =
  window.location.pathname === '/bridge/embed'
    ? LIFI_INTEGRATOR_IDS.EMBED
    : LIFI_INTEGRATOR_IDS.NORMAL;

const queryClient = new QueryClient();

createConfig({ integrator: integratorId });
initializeDayjs();

if (!isProductionEnvironment || isE2eTestingEnvironment) {
  registerLocalNetwork();
}

export function AppProviders({ children }: PropsWithChildren) {
  const overmind = useMemo(() => createOvermind(config), []);

  return (
    <OvermindProvider value={overmind}>
      <PostHogProvider client={posthog}>
        <ArbQueryParamProvider>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <AppContextProvider>{children}</AppContextProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </ArbQueryParamProvider>
      </PostHogProvider>
    </OvermindProvider>
  );
}

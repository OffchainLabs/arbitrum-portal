import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createOvermindMock } from 'overmind';
import { Provider as OvermindProvider } from 'overmind-react';
import React, { PropsWithChildren, useMemo, useState } from 'react';
import { SWRConfig } from 'swr';
import {
  PartialLocation,
  QueryParamAdapter,
  QueryParamAdapterComponent,
  QueryParamProvider,
} from 'use-query-params';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';

import { ContractStorage, ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { queryParamProviderOptions } from '../hooks/useArbQueryParams';
import { config } from '../state';

function createAdapter(initialLocation: PartialLocation): QueryParamAdapterComponent {
  return ({ children }) => {
    const [currentLocation, setCurrentLocation] = useState<PartialLocation>(initialLocation);

    const adapter = useMemo<QueryParamAdapter>(
      () => ({
        replace: (newLocation) => setCurrentLocation((prev) => ({ ...prev, ...newLocation })),
        push: (newLocation) => setCurrentLocation((prev) => ({ ...prev, ...newLocation })),
        get location() {
          return currentLocation;
        },
      }),
      [currentLocation],
    );

    return children(adapter);
  };
}

type CreateIntegrationWrapperParams = {
  search?: string;
  bridgeTokens?: ContractStorage<ERC20BridgeToken>;
};

export function createIntegrationWrapper({
  search = '',
  bridgeTokens,
}: CreateIntegrationWrapperParams = {}) {
  const queryClient = new QueryClient();
  const adapter = createAdapter({
    search,
  });
  const wagmiConfig = createConfig({
    chains: [mainnet],
    transports: {
      [mainnet.id]: http(),
    },
    multiInjectedProviderDiscovery: false,
    ssr: false,
  });

  const overmind = createOvermindMock(config, (state) => {
    if (!bridgeTokens) {
      return;
    }

    state.app.arbTokenBridge = {
      bridgeTokens,
      eth: {} as never,
      token: {} as never,
    };
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <OvermindProvider value={overmind}>
      <QueryParamProvider adapter={adapter} options={queryParamProviderOptions}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <SWRConfig
              value={{
                provider: () => new Map(),
              }}
            >
              {children}
            </SWRConfig>
          </QueryClientProvider>
        </WagmiProvider>
      </QueryParamProvider>
    </OvermindProvider>
  );

  return Wrapper;
}

export function getSearchParams(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      searchParams.set(key, String(value));
    }
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
}

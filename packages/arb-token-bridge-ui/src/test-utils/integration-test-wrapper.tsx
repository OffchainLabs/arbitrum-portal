import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { PropsWithChildren, useMemo, useState } from 'react';
import { type Middleware, SWRConfig } from 'swr';
import {
  PartialLocation,
  QueryParamAdapter,
  QueryParamAdapterComponent,
  QueryParamProvider,
} from 'use-query-params';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';

import { TooltipProvider } from '@/app/components/common/Tooltip';

import { useArbTokenBridgeBootstrap } from '../components/App/useArbTokenBridgeBootstrap';
import { ArbTokenBridgeStoreSync } from '../components/syncers/ArbTokenBridgeStoreSync';
import { TokenListSyncer } from '../components/syncers/TokenListSyncer';
import { queryParamProviderOptions } from '../hooks/useArbQueryParams';
import { defaultState } from '../state/app/state';
import { useAppStore } from '../state/index';

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
  swrMiddleware?: Middleware[];
};

function IntegrationBootstrap() {
  const tokenBridgeParams = useArbTokenBridgeBootstrap();

  return (
    <>
      {tokenBridgeParams ? <ArbTokenBridgeStoreSync tokenBridgeParams={tokenBridgeParams} /> : null}
      <TokenListSyncer />
    </>
  );
}

export function createIntegrationWrapper({
  search = '',
  swrMiddleware,
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

  const Wrapper = ({ children }: PropsWithChildren) => {
    useState(() => {
      useAppStore.setState({
        ...defaultState,
      });
    });

    return (
      <QueryParamProvider adapter={adapter} options={queryParamProviderOptions}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <SWRConfig
                value={{
                  provider: () => new Map(),
                  use: swrMiddleware,
                }}
              >
                <IntegrationBootstrap />
                {children}
              </SWRConfig>
            </TooltipProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </QueryParamProvider>
    );
  };

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

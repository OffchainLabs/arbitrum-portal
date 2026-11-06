import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';
import type { Key } from 'swr';
import { vi } from 'vitest';
import { type Config, WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';

import { AppContextProvider } from '../components/App/AppContext';
import type { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { useAppStore } from '../state';
import { type AppState, defaultState } from '../state/app/state';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { getBalanceClient } from '../wallet/balance/getBalanceClient';
import type { BalanceClient, WalletContextValue } from '../wallet/types';
import { createWalletTestWrapper } from './wallet-test-wrapper';

vi.mock('../wallet/balance/getBalanceClient', () => ({ getBalanceClient: vi.fn() }));

export function createBridgeTestWrapper({
  query,
  wallets = defaultWalletContextValue,
  fetchBalance = async () => ({}),
  bridgeTokens = {},
  cacheEntries = [],
  app = {},
  wagmiConfig = createConfig({
    storage: null,
    chains: [mainnet],
    transports: { [mainnet.id]: http() },
    multiInjectedProviderDiscovery: false,
  }),
}: {
  query: Record<string, string | number | null | undefined> & {
    sourceChain: number;
    destinationChain: number;
  };
  wallets?: WalletContextValue;
  fetchBalance?: BalanceClient['fetchBalance'];
  bridgeTokens?: Record<string, ERC20BridgeToken>;
  cacheEntries?: ReadonlyArray<readonly [Key, unknown]>;
  app?: Partial<AppState>;
  wagmiConfig?: Config;
}) {
  const { parentChainId, childChainId } = getNetworksRelationship({
    sourceChainId: query.sourceChain,
    destinationChainId: query.destinationChain,
  });
  const QueryWrapper = createWalletTestWrapper({
    wallets,
    query: Object.fromEntries(
      Object.entries(query).flatMap(([key, value]) =>
        typeof value === 'string' || typeof value === 'number' ? [[key, value]] : [],
      ),
    ),
    cacheEntries: [
      ['eth-price', 2000],
      [['useTokenLists', childChainId, parentChainId], []],
      [[[], parentChainId, childChainId, 'useTokensFromLists'], {}],
      ...cacheEntries,
    ],
  });
  vi.mocked(getBalanceClient).mockReturnValue({ fetchBalance });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    useState(() =>
      useAppStore.setState({
        ...defaultState,
        arbTokenBridge: { ...defaultState.arbTokenBridge, bridgeTokens },
        ...app,
      }),
    );
    return (
      <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
        <QueryClientProvider client={queryClient}>
          <AppContextProvider>
            <QueryWrapper>{children}</QueryWrapper>
          </AppContextProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  };
}

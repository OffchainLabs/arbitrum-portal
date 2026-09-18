import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';
import type { Key } from 'swr';
import { type Config, WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { mock } from 'wagmi/connectors';

import { AppContextProvider } from '../components/App/AppContext';
import type { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { useAppStore } from '../state';
import { type AppState, defaultState } from '../state/app/state';
import { ChainId } from '../types/ChainId';
import type { NativeCurrency } from '../types/NativeCurrency';
import type { EvmAddress } from '../util/AddressUtils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { getChainMetadata } from '../util/networkMetadata';
import { initializeBridgeNetworks } from '../util/networks';
import { defaultWalletContextValue } from '../wallet/WalletContext';
import { BalanceProvider } from '../wallet/balance/BalanceContext';
import { createBalanceService } from '../wallet/balance/createBalanceService';
import type { BalanceClient, WalletContextValue } from '../wallet/types';
import { createWalletTestWrapper } from './wallet-test-wrapper';

export function createBridgeTestWrapper({
  query,
  wallets = defaultWalletContextValue,
  fetchBalance = async () => ({}),
  bridgeTokens = {},
  nativeCurrencies = {},
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
  nativeCurrencies?: Record<number, NativeCurrency>;
  cacheEntries?: ReadonlyArray<readonly [Key, unknown]>;
  app?: Partial<AppState>;
  wagmiConfig?: Config;
}) {
  initializeBridgeNetworks();
  const { parentChainId, childChainId } = getNetworksRelationship({
    sourceChainId: query.sourceChain,
    destinationChainId: query.destinationChain,
  });
  const currencies = Array.from(
    new Set([query.sourceChain, query.destinationChain, parentChainId, childChainId]),
  ).map(
    (chainId) =>
      [
        [chainId, parentChainId, 'nativeCurrency'],
        nativeCurrencies[chainId] ?? {
          ...(chainId === ChainId.Solana
            ? { name: 'Solana', symbol: 'SOL', decimals: 9 }
            : getChainMetadata(chainId).nativeCurrency),
          isCustom: false,
        },
      ] as const,
  );
  const QueryWrapper = createWalletTestWrapper({
    wallets,
    query: Object.fromEntries(
      Object.entries(query).flatMap(([key, value]) =>
        typeof value === 'string' || typeof value === 'number' ? [[key, value]] : [],
      ),
    ),
    cacheEntries: [
      ...currencies,
      ['eth-price', 2000],
      ...Object.values(wallets).flatMap((wallet) =>
        wallet.account.address
          ? [
              [
                [wallet.account.address, query.sourceChain, 'useAccountType'],
                'externally-owned-account',
              ] as const,
            ]
          : [],
      ),
      [['useTokenLists', childChainId, parentChainId], []],
      [[[], parentChainId, childChainId, 'useTokensFromLists'], {}],
      ...cacheEntries,
    ],
  });
  const service = createBalanceService(() => ({ fetchBalance }));
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
            <QueryWrapper>
              <BalanceProvider service={service}>{children}</BalanceProvider>
            </QueryWrapper>
          </AppContextProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  };
}

export function createConnectedWagmiConfig(address: EvmAddress) {
  const config = createConfig({
    storage: null,
    chains: [mainnet],
    transports: { [mainnet.id]: http() },
    connectors: [mock({ accounts: [address] })],
    multiInjectedProviderDiscovery: false,
  });
  const connector = config.connectors[0];
  if (!connector) throw new Error('Missing test connector');
  config.setState((state) => ({
    ...state,
    status: 'connected',
    current: connector.uid,
    connections: new Map([
      [connector.uid, { accounts: [address], chainId: mainnet.id, connector }],
    ]),
  }));
  return config;
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TokenInfo } from '@uniswap/token-lists';
import { type PropsWithChildren, useState } from 'react';
import type { Key } from 'swr';
import { vi } from 'vitest';
import { type Config, WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { mock } from 'wagmi/connectors';

import { AppContextProvider } from '../components/App/AppContext';
import type { ERC20BridgeToken } from '../hooks/arbTokenBridge.types';
import { useAppStore } from '../state';
import { type AppState, defaultState } from '../state/app/state';
import type { EvmAddress } from '../util/AddressUtils';
import { LIFI_TRANSFER_LIST_ID, type TokenListWithId } from '../util/TokenListUtils';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { initializeBridgeNetworks } from '../util/networks';
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
  listTokens = [],
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
  // Tokens of the LiFi token list, for the hooks that read the token lists
  listTokens?: TokenInfo[];
  app?: Partial<AppState>;
  wagmiConfig?: Config;
}) {
  initializeBridgeNetworks();
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
      [
        ['useTokenLists', childChainId, parentChainId],
        listTokens.length > 0
          ? [
              {
                name: 'Test token list',
                timestamp: new Date(0).toISOString(),
                version: { major: 1, minor: 0, patch: 0 },
                tokens: listTokens,
                l2ChainId: String(childChainId),
                bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
              } satisfies TokenListWithId,
            ]
          : [],
      ],
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

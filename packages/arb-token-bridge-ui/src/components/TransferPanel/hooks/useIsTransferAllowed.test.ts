import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ArbTokenBridge } from '../../../hooks/arbTokenBridge.types';
import { useAppStore } from '../../../state';
import { defaultState } from '../../../state/app/state';
import { ChainId } from '../../../types/ChainId';
import { useIsTransferAllowed } from './useIsTransferAllowed';
import { type RouteType, useRouteStore } from './useRouteStore';

const source = vi.hoisted(() => ({ chainId: 0, address: '' }));

vi.mock('../../../wallet/hooks/useWallets', () => ({
  useWallets: () => ({
    sourceWallet: {
      isConnected: true,
      account: { address: source.address, chainId: source.chainId },
    },
  }),
}));

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: () => [
    { sourceChain: { id: source.chainId }, destinationChain: { id: ChainId.ArbitrumOne } },
  ],
}));

const sourceAddresses: Partial<Record<ChainId, string>> = {
  [ChainId.Ethereum]: '0x1111111111111111111111111111111111111111',
  [ChainId.Solana]: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
};

vi.mock('./useDestinationAddressError', () => ({
  useDestinationAddressError: () => ({ destinationAddressError: undefined }),
}));

afterEach(() => {
  useRouteStore.getState().clearRoute();
  useAppStore.setState({
    arbTokenBridge: defaultState.arbTokenBridge,
    arbTokenBridgeLoaded: false,
  });
});

describe.sequential('useIsTransferAllowed', () => {
  it.each<[ChainId, RouteType, boolean, boolean]>([
    [ChainId.Ethereum, 'arbitrum', false, false],
    [ChainId.Ethereum, 'arbitrum', true, true],
    [ChainId.Ethereum, 'lifi', false, true],
    [ChainId.Solana, 'lifi', false, true],
  ])('source %s, %s route, bridge SDK loaded %s: %s', (sourceChain, route, loaded, allowed) => {
    source.chainId = sourceChain;
    source.address = sourceAddresses[sourceChain] ?? '';
    useRouteStore.setState({ selectedRoute: route });
    useAppStore.setState({
      arbTokenBridgeLoaded: loaded,
      arbTokenBridge: loaded
        ? ({ eth: { triggerOutbox: async () => {} } } as unknown as ArbTokenBridge)
        : defaultState.arbTokenBridge,
    });

    const { result } = renderHook(useIsTransferAllowed);

    expect(result.current).toBe(allowed);
  });
});

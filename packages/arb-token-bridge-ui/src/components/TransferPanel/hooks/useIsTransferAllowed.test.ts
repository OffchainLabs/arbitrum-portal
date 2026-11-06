import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ArbTokenBridge } from '../../../hooks/arbTokenBridge.types';
import { useAppStore } from '../../../state';
import { defaultState } from '../../../state/app/state';
import { ChainId } from '../../../types/ChainId';
import { useIsTransferAllowed } from './useIsTransferAllowed';
import { type RouteType, useRouteStore } from './useRouteStore';

vi.mock('wagmi', async () => ({
  ...(await vi.importActual('wagmi')),
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
    chain: { id: ChainId.Ethereum },
  }),
}));

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: () => [
    { sourceChain: { id: ChainId.Ethereum }, destinationChain: { id: ChainId.ArbitrumOne } },
  ],
}));

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
  it.each<[RouteType, boolean, boolean]>([
    ['arbitrum', false, false],
    ['arbitrum', true, true],
    ['lifi', false, true],
  ])('%s route, bridge SDK loaded %s: %s', (route, loaded, allowed) => {
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

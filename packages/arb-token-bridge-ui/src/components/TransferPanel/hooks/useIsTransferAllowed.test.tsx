import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultState } from '../../../state/app/state';
import { createBridgeTestWrapper } from '../../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../../types/ChainId';
import { defaultWalletContextValue } from '../../../wallet/WalletContext';
import type { WalletContextValue } from '../../../wallet/types';
import { useIsTransferAllowed } from './useIsTransferAllowed';
import { type RouteType, useRouteStore } from './useRouteStore';

vi.mock('../../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../../util/featureFlag')>()),
  isLifiEnabled: () => true,
}));
vi.mock('../../../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});

const disconnect = async () => {};
const wallets: WalletContextValue = {
  evm: {
    ecosystem: 'evm',
    isConnected: true,
    disconnect,
    account: {
      ecosystem: 'evm',
      status: 'connected',
      chainId: ChainId.Ethereum,
      address: '0x1111111111111111111111111111111111111111',
    },
    signer: defaultWalletContextValue.evm.signer,
  },
  solana: {
    ecosystem: 'solana',
    isConnected: true,
    disconnect,
    account: {
      ecosystem: 'solana',
      status: 'connected',
      chainId: ChainId.Solana,
      address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
    },
    signer: defaultWalletContextValue.solana.signer,
  },
};

afterEach(() => {
  cleanup();
  useRouteStore.getState().clearRoute();
});

describe.sequential('useIsTransferAllowed', () => {
  it.each<[ChainId, RouteType, boolean, boolean]>([
    [ChainId.Ethereum, 'arbitrum', false, false],
    [ChainId.Ethereum, 'arbitrum', true, true],
    [ChainId.Ethereum, 'lifi', false, true],
    [ChainId.Solana, 'lifi', false, true],
  ])('source %s, %s route, bridge SDK loaded %s: %s', (sourceChain, route, loaded, allowed) => {
    useRouteStore.setState({ selectedRoute: route });
    const eth = loaded ? { triggerOutbox: async () => {} } : defaultState.arbTokenBridge.eth;
    const { result } = renderHook(useIsTransferAllowed, {
      wrapper: createBridgeTestWrapper({
        wallets,
        query: { sourceChain, destinationChain: ChainId.ArbitrumOne },
        app: {
          arbTokenBridgeLoaded: loaded,
          arbTokenBridge: { ...defaultState.arbTokenBridge, eth },
        },
      }),
    });
    expect(result.current).toBe(allowed);
  });
});

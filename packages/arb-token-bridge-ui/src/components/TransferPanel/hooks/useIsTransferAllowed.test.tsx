import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBridgeTestWrapper } from '../../../test-utils/bridge-test-wrapper';
import { ChainId } from '../../../types/ChainId';
import { defaultWalletContextValue } from '../../../wallet/WalletContext';
import type { WalletContextValue } from '../../../wallet/types';
import { useIsTransferAllowed } from './useIsTransferAllowed';
import { useRouteStore } from './useRouteStore';

vi.mock('../../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../../util/featureFlag')>()),
  isSolanaEnabled: () => true,
  isLifiEnabled: () => true,
}));
afterEach(() => {
  cleanup();
  useRouteStore.getState().clearRoute();
});
describe.sequential('useIsTransferAllowed', () => {
  it('does not require the EVM bridge SDK for a Solana transfer', () => {
    useRouteStore.setState({ selectedRoute: 'lifi' });
    const wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      solana: {
        ...defaultWalletContextValue.solana,
        isConnected: true,
        account: {
          ecosystem: 'solana',
          status: 'connected',
          chainId: ChainId.Solana,
          address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
        },
      },
    };
    const { result } = renderHook(useIsTransferAllowed, {
      wrapper: createBridgeTestWrapper({
        wallets,
        query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    expect(result.current).toBe(true);
  });
  it.each([
    ['arbitrum', false],
    ['lifi', true],
  ] as const)('requires the bridge SDK only for canonical routes: %s', (selectedRoute, allowed) => {
    useRouteStore.setState({ selectedRoute });
    const wallets: WalletContextValue = {
      ...defaultWalletContextValue,
      evm: {
        ...defaultWalletContextValue.evm,
        isConnected: true,
        account: {
          ecosystem: 'evm',
          status: 'connected',
          chainId: ChainId.Ethereum,
          address: '0x1111111111111111111111111111111111111111',
        },
      },
    };
    const { result } = renderHook(useIsTransferAllowed, {
      wrapper: createBridgeTestWrapper({
        wallets,
        query: { sourceChain: ChainId.Ethereum, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    expect(result.current).toBe(allowed);
  });
});

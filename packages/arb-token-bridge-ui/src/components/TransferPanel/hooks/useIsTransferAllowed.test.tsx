import { renderHook } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../types/ChainId';
import { defaultWalletContextValue } from '../../../wallet/WalletContext';
import type { WalletHandle } from '../../../wallet/types';
import { useIsTransferAllowed } from './useIsTransferAllowed';

const testState = vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true');
  return {
    sourceChainId: 1,
    wallet: undefined as WalletHandle | undefined,
    arbTokenBridgeLoaded: false,
    eth: undefined as object | undefined,
  };
});

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: () => [{ sourceChain: { id: testState.sourceChainId } }],
}));
vi.mock('../../../state', () => ({
  useAppState: () => ({
    app: {
      arbTokenBridgeLoaded: testState.arbTokenBridgeLoaded,
      arbTokenBridge: { eth: testState.eth },
    },
  }),
}));
vi.mock('../../../wallet/hooks/useWallets', () => ({
  useWallets: () => ({ sourceWallet: testState.wallet }),
}));
vi.mock('./useDestinationAddressError', () => ({
  useDestinationAddressError: () => ({ destinationAddressError: undefined }),
}));

beforeEach(() => {
  testState.sourceChainId = ChainId.Ethereum;
  testState.wallet = defaultWalletContextValue.evm;
  testState.arbTokenBridgeLoaded = false;
  testState.eth = undefined;
});

afterAll(() => vi.unstubAllEnvs());

describe('useIsTransferAllowed', () => {
  it('does not require the EVM bridge SDK for a Solana transfer', () => {
    testState.sourceChainId = ChainId.Solana;
    testState.wallet = {
      ...defaultWalletContextValue.solana,
      isConnected: true,
      account: {
        ecosystem: 'solana',
        status: 'connected',
        chainId: ChainId.Solana,
        address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
      },
    };

    expect(renderHook(() => useIsTransferAllowed()).result.current).toBe(true);
  });

  it('still requires the bridge SDK for an EVM transfer', () => {
    testState.wallet = {
      ...defaultWalletContextValue.evm,
      isConnected: true,
      account: {
        ecosystem: 'evm',
        status: 'connected',
        chainId: ChainId.Ethereum,
        address: '0x1111111111111111111111111111111111111111',
      },
    };

    expect(renderHook(() => useIsTransferAllowed()).result.current).toBe(false);
  });
});

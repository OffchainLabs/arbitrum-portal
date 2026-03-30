import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNetworks } from '../../../hooks/useNetworks';
import { ChainId } from '../../../types/ChainId';
import { isSolanaEnabled } from '../../../util/featureFlag';
import { EvmWalletContext } from '../../contexts/EvmWalletContext';
import {
  SolanaWalletContext,
  defaultSolanaWalletContextValue,
} from '../../contexts/SolanaWalletContext';
import type { WalletHandle } from '../../types';
import { createNetworksState } from './utils';
import { useWallets } from '../useWallets';

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../../../util/featureFlag', () => ({
  isSolanaEnabled: vi.fn(),
}));

const evmWallet: WalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: '0x1234',
    chain: { id: ChainId.ArbitrumOne },
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
};

const solanaWallet: WalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: 'So11111111111111111111111111111111111111112',
    chain: { id: ChainId.Solana },
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
};

function createWrapper({
  evm = evmWallet,
  solana = defaultSolanaWalletContextValue,
}: {
  evm?: WalletHandle;
  solana?: WalletHandle;
}) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <EvmWalletContext.Provider value={evm}>
        <SolanaWalletContext.Provider value={solana}>{children}</SolanaWalletContext.Provider>
      </EvmWalletContext.Provider>
    );
  };
}

describe('wallet/hooks/useWallets', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the EVM wallet for EVM source and destination chains', () => {
    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Base,
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(false);

    const { result } = renderHook(() => useWallets(), {
      wrapper: createWrapper({ evm: evmWallet }),
    });

    expect(result.current.sourceWallet).toBe(evmWallet);
    expect(result.current.destinationWallet).toBe(evmWallet);
  });

  it('returns the Solana wallet when Solana is enabled and the source chain is Solana', () => {
    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(true);

    const { result } = renderHook(() => useWallets(), {
      wrapper: createWrapper({ evm: evmWallet, solana: solanaWallet }),
    });

    expect(result.current.sourceWallet).toBe(solanaWallet);
    expect(result.current.destinationWallet).toBe(evmWallet);
  });

  it('falls back to EVM when Solana is disabled even if the chain id is Solana', () => {
    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(false);

    const { result } = renderHook(() => useWallets(), {
      wrapper: createWrapper({ evm: evmWallet, solana: solanaWallet }),
    });

    expect(result.current.sourceWallet).toBe(evmWallet);
  });
});

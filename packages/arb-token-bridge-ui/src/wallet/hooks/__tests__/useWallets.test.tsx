import { renderHook } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNetworks } from '../../../hooks/useNetworks';
import { ChainId } from '../../../types/ChainId';
import { isSolanaEnabled } from '../../../util/featureFlag';
import { WalletContext, defaultWalletContextValue } from '../../providers/WalletProvider';
import type { EvmWalletHandle, SolanaWalletHandle } from '../../types';
import { useWallets } from '../useWallets';
import { createNetworksState } from './utils';

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../../../util/featureFlag', () => ({
  isSolanaEnabled: vi.fn(),
}));

const evmWallet: EvmWalletHandle = {
  ecosystem: 'evm',
  account: {
    ecosystem: 'evm',
    address: '0x1234',
    chain: { id: ChainId.ArbitrumOne },
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
  sendTransaction: async () => ({ hash: '0xhash' }),
};

const solanaWallet: SolanaWalletHandle = {
  ecosystem: 'solana',
  account: {
    ecosystem: 'solana',
    address: 'So11111111111111111111111111111111111111112',
    chain: { id: ChainId.Solana },
    status: 'connected',
  },
  isConnected: true,
  disconnect: async () => {},
  sendTransaction: async () => ({ hash: 'solana-hash' }),
};

function createWrapper({
  evm = evmWallet,
  solana = defaultWalletContextValue.solana,
}: {
  evm?: EvmWalletHandle;
  solana?: SolanaWalletHandle;
}) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <WalletContext.Provider value={{ evm, solana }}>{children}</WalletContext.Provider>;
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

    expect(result.current.sourceWallet.ecosystem).toBe('evm');
    expect(result.current.destinationWallet.ecosystem).toBe('evm');
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

    expect(result.current.sourceWallet.ecosystem).toBe('solana');
    expect(result.current.destinationWallet.ecosystem).toBe('evm');
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

    expect(result.current.sourceWallet.ecosystem).toBe('evm');
  });

  it('forwards a prepared Solana transaction to the Solana provider', async () => {
    const sendTransaction = vi.fn().mockResolvedValue({ hash: 'solana-hash' });
    const wallet: SolanaWalletHandle = {
      ...solanaWallet,
      sendTransaction,
    };

    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(true);

    const { result } = renderHook(() => useWallets(), {
      wrapper: createWrapper({ evm: evmWallet, solana: wallet }),
    });
    const input = {
      serializedTransaction: 'serialized-transaction',
    };
    await result.current.sourceWallet.sendTransaction(input);

    expect(sendTransaction).toHaveBeenCalledWith(input);
  });

  it('forwards a prepared EVM transaction to the EVM provider', async () => {
    const sendTransaction = vi.fn().mockResolvedValue({ hash: '0xhash' });
    const wallet: EvmWalletHandle = {
      ...evmWallet,
      sendTransaction,
    };
    const input = {
      txRequest: {
        chainId: ChainId.ArbitrumOne,
        to: '0x1234',
      },
    };

    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({ sourceChainId: ChainId.ArbitrumOne }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(true);

    const { result } = renderHook(() => useWallets(), {
      wrapper: createWrapper({ evm: wallet }),
    });

    await result.current.sourceWallet.sendTransaction(input);

    expect(sendTransaction).toHaveBeenCalledWith(input);
  });

  it('rejects a Solana transaction sent through the EVM wallet', () => {
    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({ sourceChainId: ChainId.ArbitrumOne }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(true);

    const { result } = renderHook(() => useWallets(), {
      wrapper: createWrapper({ evm: evmWallet }),
    });

    expect(() =>
      result.current.sourceWallet.sendTransaction({
        serializedTransaction: 'serialized-transaction',
      }),
    ).toThrow('Invalid transaction: expected an EVM transaction.');
  });

  it('rejects an EVM transaction sent through the Solana wallet', () => {
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

    expect(() =>
      result.current.sourceWallet.sendTransaction({
        txRequest: {
          chainId: ChainId.ArbitrumOne,
          to: '0x1234',
        },
      }),
    ).toThrow('Invalid transaction: expected a Solana transaction.');
  });
});

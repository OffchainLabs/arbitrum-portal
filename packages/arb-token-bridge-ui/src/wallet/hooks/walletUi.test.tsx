import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkWalletButton } from '../../components/TransferPanel/NetworkWalletButton';
import { createWalletTestWrapper } from '../../test-utils/wallet-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { defaultWalletContextValue } from '../WalletContext';
import type { WalletContextValue } from '../types';
import { useWalletModal } from './useWalletModal';

const external = vi.hoisted(() => ({
  open: vi.fn(),
  getCaipNetwork: vi.fn(),
  setCaipNetwork: vi.fn(),
}));
vi.mock('@reown/appkit/react', () => ({ useAppKit: () => ({ open: external.open }) }));
vi.mock('../../util/wagmi/setup', () => ({ appKit: external }));

vi.mock('../../util/featureFlag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/featureFlag')>()),
  isLifiEnabled: () => true,
}));
vi.mock('../ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});

const solanaAddress = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
const evmAddress = '0x1111111111111111111111111111111111111111';
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
describe.sequential('wallet UI through wallet hooks', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    'shows each connected wallet in its own network box, EVM=%s Solana=%s',
    (evmConnected, solanaConnected) => {
      const wallets: WalletContextValue = {
        evm: {
          ...defaultWalletContextValue.evm,
          disconnect: vi.fn(async () => {}),
          isConnected: evmConnected,
          account: {
            ecosystem: 'evm',
            status: evmConnected ? 'connected' : 'disconnected',
            address: evmConnected ? evmAddress : undefined,
            chainId: 1,
          },
        },
        solana: {
          ...defaultWalletContextValue.solana,
          disconnect: vi.fn(async () => {}),
          isConnected: solanaConnected,
          account: {
            ecosystem: 'solana',
            status: solanaConnected ? 'connected' : 'disconnected',
            address: solanaConnected ? solanaAddress : undefined,
            chainId: ChainId.Solana,
          },
        },
      };
      render(
        <>
          <NetworkWalletButton chainId={ChainId.Solana} />
          <NetworkWalletButton chainId={42161} />
        </>,
        {
          wrapper: createWalletTestWrapper({
            wallets,
            query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
          }),
        },
      );
      expect(screen.queryByTitle(solanaAddress) !== null).toBe(solanaConnected);
      expect(screen.queryByTitle(evmAddress) !== null).toBe(evmConnected);
      expect(screen.queryByRole('button')).toBeNull();
    },
  );
});

describe('useWalletModal', () => {
  it.each([
    [ChainId.Ethereum, 'eip155'],
    [ChainId.Solana, 'solana'],
  ])('connects the source chain %s through the %s namespace', async (sourceChain, namespace) => {
    const { result } = renderHook(() => useWalletModal(), {
      wrapper: createWalletTestWrapper({
        query: { sourceChain, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(() => result.current.openConnectModal());
    expect(external.open).toHaveBeenCalledWith({ view: 'Connect', namespace });
  });

  it('connects another ecosystem through its own namespace', async () => {
    const { result } = renderHook(() => useWalletModal(), {
      wrapper: createWalletTestWrapper({
        query: { sourceChain: ChainId.Solana, destinationChain: ChainId.ArbitrumOne },
      }),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    await act(() => result.current.openConnectModalFor('evm'));
    expect(external.getCaipNetwork).toHaveBeenCalledWith('eip155', ChainId.ArbitrumOne);
    expect(external.open).toHaveBeenCalledWith({ view: 'Connect', namespace: 'eip155' });
  });
});

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNetworks } from '../../../hooks/useNetworks';
import { ChainId } from '../../../types/ChainId';
import { isSolanaEnabled } from '../../../util/featureFlag';
import { createChain, createNetworksState } from './utils';

const getWagmiChainMock = vi.fn();

const openMock = vi.fn();
const switchNetworkMock = vi.fn();

vi.mock('@reown/appkit/react', () => ({
  useAppKit: () => ({
    open: openMock,
  }),
  useAppKitNetwork: () => ({
    switchNetwork: switchNetworkMock,
  }),
}));

vi.mock('../../../hooks/useNetworks', () => ({
  useNetworks: vi.fn(),
}));

vi.mock('../../../util/featureFlag', () => ({
  isSolanaEnabled: vi.fn(),
}));

vi.mock('../../../util/wagmi/getWagmiChain', () => ({
  getWagmiChain: (chainId: number) => getWagmiChainMock(chainId),
}));

describe('wallet/hooks/useWalletModal', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getWagmiChainMock.mockReset();
    openMock.mockReset();
    switchNetworkMock.mockReset();
  });

  it('opens the source EVM modal by default', async () => {
    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.ArbitrumOne,
        sourceChainName: 'Arbitrum',
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(false);

    const { useWalletModal } = await import('../useWalletModal');
    const { result } = renderHook(() => useWalletModal());

    await result.current.openConnectModal();

    expect(openMock).toHaveBeenCalledWith({ view: 'Connect', namespace: 'eip155' });
  });

  it('opens the Solana modal when the requested chain id is Solana', async () => {
    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.Solana,
        sourceChainName: 'Solana',
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(true);

    const { useWalletModal } = await import('../useWalletModal');
    const { result } = renderHook(() => useWalletModal());

    switchNetworkMock.mockClear();
    openMock.mockClear();

    await result.current.openConnectModal(ChainId.Solana);

    expect(openMock).toHaveBeenCalledWith({ view: 'Connect', namespace: 'solana' });
  });

  it('opens the EVM modal for the destination chain id', async () => {
    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
        sourceChainName: 'Solana',
        destinationChainName: 'Arbitrum',
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(true);

    const { useWalletModal } = await import('../useWalletModal');
    const { result } = renderHook(() => useWalletModal());

    await result.current.openConnectModal(ChainId.ArbitrumOne);

    expect(switchNetworkMock).toHaveBeenCalledWith({ id: ChainId.ArbitrumOne, name: 'Arbitrum' });
    expect(openMock).toHaveBeenCalledWith({ view: 'Connect', namespace: 'eip155' });
  });

  it('resolves a non-source non-destination EVM chain id via getWagmiChain', async () => {
    const baseChain = createChain(ChainId.Base, 'Base');

    vi.mocked(useNetworks).mockReturnValue([
      createNetworksState({
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.Solana,
        sourceChainName: 'Arbitrum',
        destinationChainName: 'Solana',
      }),
      vi.fn(),
    ]);
    vi.mocked(isSolanaEnabled).mockReturnValue(true);
    getWagmiChainMock.mockReturnValue(baseChain);

    const { useWalletModal } = await import('../useWalletModal');
    const { result } = renderHook(() => useWalletModal());

    await result.current.openConnectModal(ChainId.Base);

    expect(getWagmiChainMock).toHaveBeenCalledWith(ChainId.Base);
    expect(switchNetworkMock).toHaveBeenCalledWith(baseChain);
    expect(openMock).toHaveBeenCalledWith({ view: 'Connect', namespace: 'eip155' });
  });
});

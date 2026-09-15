import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../types/ChainId';
import { useWalletModal } from './useWalletModal';

const mocks = vi.hoisted(() => ({
  additionalSourceChainIds: [] as number[],
  open: vi.fn(),
  getCaipNetwork: vi.fn(),
  setCaipNetwork: vi.fn(),
}));
vi.mock('@/app/src/walletConfig', () => ({
  additionalSourceChainIds: mocks.additionalSourceChainIds,
}));
vi.mock('@reown/appkit/react', () => ({ useAppKit: () => ({ open: mocks.open }) }));
vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: () => [{ sourceChain: { id: 42161 } }],
}));
vi.mock('../../util/wagmi/setup', () => ({ appKit: mocks }));

describe.sequential('useWalletModal', () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    mocks.additionalSourceChainIds.length = 0;
  });
  it('keeps the selected EVM chain for existing connect actions', async () => {
    const network = { id: ChainId.ArbitrumOne };
    mocks.getCaipNetwork.mockReturnValue(network);
    const { result } = renderHook(useWalletModal);
    await result.current.openConnectModal();
    expect(mocks.getCaipNetwork).toHaveBeenCalledWith('eip155', ChainId.ArbitrumOne);
    expect(mocks.setCaipNetwork).toHaveBeenCalledWith(network);
    expect(mocks.open).toHaveBeenCalledWith({ view: 'Connect', namespace: 'eip155' });
  });
  it('opens the requested EVM chain', async () => {
    const { result } = renderHook(useWalletModal);
    await result.current.openConnectModal(ChainId.Ethereum);
    expect(mocks.getCaipNetwork).toHaveBeenCalledWith('eip155', ChainId.Ethereum);
  });
  it('opens only the Solana namespace when enabled', async () => {
    mocks.additionalSourceChainIds.push(ChainId.Solana);
    const { result } = renderHook(useWalletModal);
    await result.current.openConnectModal(ChainId.Solana);
    expect(mocks.open).toHaveBeenCalledWith({ view: 'Connect', namespace: 'solana' });
    expect(mocks.setCaipNetwork).not.toHaveBeenCalled();
  });
  it('does not open a Solana session when disabled', async () => {
    const { result } = renderHook(useWalletModal);
    await result.current.openConnectModal(ChainId.Solana);
    expect(mocks.open).not.toHaveBeenCalled();
  });
});

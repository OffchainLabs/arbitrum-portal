import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '../../token-bridge-sdk/utils';
import { ChainId } from '../../types/ChainId';
import { useArbTokenBridgeBootstrap } from './useArbTokenBridgeBootstrap';

const fixture = vi.hoisted(() => ({
  sourceChainId: 1,
  destinationChainId: 42161,
  reset: vi.fn(),
  setChainIds: vi.fn(),
}));
const app = { reset: fixture.reset, setChainIds: fixture.setChainIds };
vi.mock('../../state', () => ({ useActions: () => ({ app }) }));
vi.mock('../../hooks/useNetworks', () => ({
  useNetworks: () => [
    {
      sourceChain: { id: fixture.sourceChainId },
      destinationChain: { id: fixture.destinationChainId },
    },
  ],
}));
vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({
    parentChain: {
      id: fixture.sourceChainId === 42161 ? fixture.destinationChainId : fixture.sourceChainId,
    },
    childChain: {
      id: fixture.sourceChainId === 42161 ? fixture.sourceChainId : fixture.destinationChainId,
    },
  }),
}));
vi.mock('../../token-bridge-sdk/utils', () => ({
  getProviderForChainId: vi.fn((chainId: number) => ({ chainId })),
}));

afterEach(cleanup);
beforeEach(() => {
  fixture.sourceChainId = ChainId.Ethereum;
  fixture.destinationChainId = ChainId.ArbitrumOne;
  vi.clearAllMocks();
});

describe.sequential('bridge bootstrap', () => {
  it('keeps the same bridge state when deposit becomes withdrawal', () => {
    const { rerender } = renderHook(useArbTokenBridgeBootstrap);
    expect(fixture.reset).toHaveBeenCalledTimes(1);
    [fixture.sourceChainId, fixture.destinationChainId] = [
      fixture.destinationChainId,
      fixture.sourceChainId,
    ];
    rerender();
    expect(fixture.reset).toHaveBeenCalledTimes(1);
    expect(getProviderForChainId).toHaveBeenCalledTimes(2);
  });

  it('resets when a different parent or child is selected', () => {
    const { rerender } = renderHook(useArbTokenBridgeBootstrap);
    fixture.destinationChainId = ChainId.ArbitrumNova;
    rerender();
    expect(fixture.reset).toHaveBeenCalledTimes(2);
    expect(fixture.setChainIds).toHaveBeenLastCalledWith({
      l1NetworkChainId: ChainId.Ethereum,
      l2NetworkChainId: ChainId.ArbitrumNova,
    });
  });

  it('clears EVM bridge state when selecting a cross-ecosystem pair', () => {
    const { result, rerender } = renderHook(useArbTokenBridgeBootstrap);
    expect(result.current?.l1.network.id).toBe(ChainId.Ethereum);
    fixture.sourceChainId = ChainId.Solana;
    rerender();
    expect(fixture.reset).toHaveBeenCalledTimes(2);
    expect(fixture.setChainIds).toHaveBeenLastCalledWith({
      l1NetworkChainId: ChainId.Solana,
      l2NetworkChainId: ChainId.ArbitrumOne,
    });
    expect(result.current).toBeNull();
  });
});

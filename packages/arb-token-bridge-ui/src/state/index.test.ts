import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ArbTokenBridge } from '../hooks/arbTokenBridge.types';
import { defaultState } from './app/state';
import { useActions, useAppState, useAppStore } from './index';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({ ...defaultState });
  });

  it('initializes with default state', () => {
    const { l1NetworkChainId, l2NetworkChainId, arbTokenBridgeLoaded, warningTokens } =
      useAppStore.getState();

    expect(l1NetworkChainId).toBeNull();
    expect(l2NetworkChainId).toBeNull();
    expect(arbTokenBridgeLoaded).toBe(false);
    expect(warningTokens).toEqual({});
  });

  it('setChainIds updates both chain ids', () => {
    useAppStore.getState().setChainIds({ l1NetworkChainId: 1, l2NetworkChainId: 42161 });

    const state = useAppStore.getState();
    expect(state.l1NetworkChainId).toBe(1);
    expect(state.l2NetworkChainId).toBe(42161);
  });

  it('setWarningTokens replaces the warning tokens map', () => {
    const warningTokens = { '0xabc': { address: '0xabc', type: 1 } };
    useAppStore.getState().setWarningTokens(warningTokens);

    expect(useAppStore.getState().warningTokens).toBe(warningTokens);
  });

  it('setArbTokenBridgeLoaded toggles the loaded flag', () => {
    useAppStore.getState().setArbTokenBridgeLoaded(true);
    expect(useAppStore.getState().arbTokenBridgeLoaded).toBe(true);

    useAppStore.getState().setArbTokenBridgeLoaded(false);
    expect(useAppStore.getState().arbTokenBridgeLoaded).toBe(false);
  });

  it('setArbTokenBridge sets loaded=true on first assignment', () => {
    const atb = { foo: 'bar' } as unknown as ArbTokenBridge;
    useAppStore.getState().setArbTokenBridge(atb);

    const state = useAppStore.getState();
    expect(state.arbTokenBridge).toBe(atb);
    expect(state.arbTokenBridgeLoaded).toBe(true);
  });

  it('setArbTokenBridge does not flip loaded back to false on subsequent assignments', () => {
    const first = { id: 1 } as unknown as ArbTokenBridge;
    const second = { id: 2 } as unknown as ArbTokenBridge;

    useAppStore.getState().setArbTokenBridge(first);
    useAppStore.getState().setArbTokenBridge(second);

    const state = useAppStore.getState();
    expect(state.arbTokenBridge).toBe(second);
    expect(state.arbTokenBridgeLoaded).toBe(true);
  });

  it('reset clears the bridge and loaded flag', () => {
    const atb = { id: 1 } as unknown as ArbTokenBridge;
    useAppStore.getState().setArbTokenBridge(atb);

    useAppStore.getState().reset();

    const state = useAppStore.getState();
    expect(state.arbTokenBridge).toEqual({});
    expect(state.arbTokenBridgeLoaded).toBe(false);
  });
});

describe('useAppState / useActions', () => {
  beforeEach(() => {
    useAppStore.setState({ ...defaultState });
  });

  it('useAppState exposes current state under the app namespace', () => {
    useAppStore.getState().setChainIds({ l1NetworkChainId: 1, l2NetworkChainId: 42161 });

    const { result } = renderHook(() => useAppState());

    expect(result.current.app.l1NetworkChainId).toBe(1);
    expect(result.current.app.l2NetworkChainId).toBe(42161);
  });

  it('useAppState re-renders when underlying state changes', () => {
    const { result } = renderHook(() => useAppState());

    expect(result.current.app.arbTokenBridgeLoaded).toBe(false);

    act(() => {
      useAppStore.getState().setArbTokenBridgeLoaded(true);
    });

    expect(result.current.app.arbTokenBridgeLoaded).toBe(true);
  });

  it('useActions returns a stable reference across calls', () => {
    const { result, rerender } = renderHook(() => useActions());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(result.current.app).toBe(first.app);
  });

  it('useActions methods mutate the store', () => {
    const { result } = renderHook(() => useActions());

    act(() => {
      result.current.app.setChainIds({ l1NetworkChainId: 5, l2NetworkChainId: 421614 });
    });

    const state = useAppStore.getState();
    expect(state.l1NetworkChainId).toBe(5);
    expect(state.l2NetworkChainId).toBe(421614);
  });
});

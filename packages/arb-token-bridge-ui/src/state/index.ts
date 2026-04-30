import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { ArbTokenBridge } from '../hooks/arbTokenBridge.types';
import { AppState, WarningTokens, defaultState } from './app/state';

type AppActions = {
  setChainIds: (payload: { l1NetworkChainId: number; l2NetworkChainId: number }) => void;
  reset: () => void;
  setWarningTokens: (warningTokens: WarningTokens) => void;
  setArbTokenBridgeLoaded: (loaded: boolean) => void;
  setArbTokenBridge: (atb: ArbTokenBridge) => void;
};

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set) => ({
  ...defaultState,
  setChainIds: ({ l1NetworkChainId, l2NetworkChainId }) =>
    set({ l1NetworkChainId, l2NetworkChainId }),
  reset: () => set({ arbTokenBridge: {} as ArbTokenBridge, arbTokenBridgeLoaded: false }),
  setWarningTokens: (warningTokens) => set({ warningTokens }),
  setArbTokenBridgeLoaded: (loaded) => set({ arbTokenBridgeLoaded: loaded }),
  setArbTokenBridge: (atb) =>
    set((s) => ({
      arbTokenBridge: atb,
      arbTokenBridgeLoaded: atb && !s.arbTokenBridgeLoaded ? true : s.arbTokenBridgeLoaded,
    })),
}));

const selectAppState = (s: AppStore): AppState => ({
  arbTokenBridge: s.arbTokenBridge,
  warningTokens: s.warningTokens,
  l1NetworkChainId: s.l1NetworkChainId,
  l2NetworkChainId: s.l2NetworkChainId,
  arbTokenBridgeLoaded: s.arbTokenBridgeLoaded,
});

export const useAppState = (): { app: AppState } => ({
  app: useAppStore(selectAppState, shallow),
});

const initialStore = useAppStore.getState();
const appActions: AppActions = {
  setChainIds: initialStore.setChainIds,
  reset: initialStore.reset,
  setWarningTokens: initialStore.setWarningTokens,
  setArbTokenBridgeLoaded: initialStore.setArbTokenBridgeLoaded,
  setArbTokenBridge: initialStore.setArbTokenBridge,
};

export const useActions = (): { app: AppActions } => ({ app: appActions });

export type Context = {
  state: { app: AppState };
  actions: { app: AppActions };
};

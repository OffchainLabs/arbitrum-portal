import { create } from 'zustand';

import type { RouteState } from '../../../util/TransferRouteUtils';

export const useRouteStore = create<RouteState>()((set) => ({
  selectedRoute: undefined,
  userSelectedRoute: undefined,
  eligibleRouteTypes: [],
  isLoading: false,
  routes: [],
  hasLowLiquidity: false,
  hasModifiedSettings: false,

  setSelectedRoute: (route) =>
    set({
      selectedRoute: route,
      userSelectedRoute: route, // Mark as user-selected to preserve across route refreshes
    }),

  clearRoute: () =>
    set({
      selectedRoute: undefined,
      userSelectedRoute: undefined,
    }),

  setRouteState: (updates) => set(updates),
}));

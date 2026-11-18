import { create } from 'zustand';

import { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi';

export type EligibleRouteType = 'arbitrum' | 'oftV2' | 'cctp' | 'lifi';

export type RouteType = EligibleRouteType | 'lifi-fastest' | 'lifi-cheapest'; // If fastest and cheapest quotes are the same

export type RouteData =
  | {
      type: 'cctp' | 'arbitrum' | 'oftV2';
      amountReceived: string;
    }
  | {
      type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest';
      route: LifiCrosschainTransfersRoute;
    };

export type RouteContext = LifiCrosschainTransfersRoute;

export type SetRoute = (route: RouteType) => void;

export type RouteStateUpdate = {
  selectedRoute: RouteType | undefined;
  eligibleRouteTypes: EligibleRouteType[];
  isLoading: boolean;
  error?: string | null;
  routes: RouteData[];
  hasLowLiquidity: boolean;
  hasModifiedSettings: boolean;
};

export interface RouteState {
  selectedRoute: RouteType | undefined; // the route that is currently selected - can be default or user-selected
  userSelectedRoute: RouteType | undefined; // subset of `selectedRoute` - filled only if user has clicked and selected a route

  eligibleRouteTypes: EligibleRouteType[];
  isLoading: boolean;
  error?: string | null;

  routes: RouteData[];

  hasLowLiquidity: boolean;
  hasModifiedSettings: boolean;

  setSelectedRoute: SetRoute;
  clearRoute: () => void;
  setRouteState: (state: Partial<RouteStateUpdate>) => void;
}

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

export function isLifiRoute(selectedRoute: RouteType | undefined) {
  return (
    selectedRoute === 'lifi' ||
    selectedRoute === 'lifi-cheapest' ||
    selectedRoute === 'lifi-fastest'
  );
}

export function isLifiRouteData(
  route: RouteData,
): route is Extract<RouteData, { route: LifiCrosschainTransfersRoute }> {
  return isLifiRoute(route.type);
}

export function getSelectedRouteContext(
  state: Pick<RouteState, 'isLoading' | 'routes' | 'selectedRoute'>,
) {
  if (state.isLoading || !state.selectedRoute || !isLifiRoute(state.selectedRoute)) {
    return undefined;
  }

  const routeData = state.routes
    .filter(isLifiRouteData)
    .find((route) => route.type === state.selectedRoute);
  if (!routeData) {
    return undefined;
  }

  return routeData.route;
}

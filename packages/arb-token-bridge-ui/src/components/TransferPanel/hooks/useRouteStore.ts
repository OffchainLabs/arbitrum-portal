import { create } from 'zustand';

import { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi';

import { RouteCost } from '../../../app/api/crosschain-transfers/types';

export type RouteType = 'arbitrum' | 'oftV2' | 'cctp' | 'lifi-fastest' | 'lifi-cheapest' | 'lifi'; // If fastest and cheapest quotes are the same

export type RouteData =
  | {
      type: 'cctp';
      data: {
        amountReceived: string;
        gasCost?: RouteCost[];
        bridgeFee?: RouteCost[];
      };
    }
  | {
      type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest';
      data: {
        route: LifiCrosschainTransfersRoute;
      };
    }
  | {
      type: 'arbitrum';
      data: {
        amountReceived: string;
        gasCost?: RouteCost[];
        bridgeFee?: RouteCost[];
      };
    }
  | {
      type: 'oftV2';
      data: {
        amountReceived: string;
        gasCost?: RouteCost[];
        bridgeFee?: RouteCost[];
      };
    };

export type RouteContext = LifiCrosschainTransfersRoute;

export type SetRoute = (route: RouteType) => void;

export type RouteStateUpdate = {
  selectedRoute: RouteType | undefined;
  eligibleRouteTypes: RouteType[];
  isLoading: boolean;
  error?: string | null;
  routes: RouteData[];
  hasLowLiquidity: boolean;
  hasModifiedSettings: boolean;
};

export interface RouteState {
  selectedRoute: RouteType | undefined; // the route that is currently selected - can be default or user-selected
  userSelectedRoute: RouteType | undefined; // subset of `selectedRoute` - filled only if user has clicked and selected a route

  eligibleRouteTypes: RouteType[];
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

export function getSelectedRouteContext(
  state: Pick<RouteState, 'isLoading' | 'routes' | 'selectedRoute'>,
) {
  if (state.isLoading || !state.selectedRoute || !isLifiRoute(state.selectedRoute)) {
    return undefined;
  }

  const routeData = state.routes.find((route) => route.type === state.selectedRoute);
  if (!routeData || !('route' in routeData.data)) {
    return undefined;
  }

  return routeData.data.route;
}

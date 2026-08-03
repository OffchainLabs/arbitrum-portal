import { utils } from 'ethers';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import type { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi';
import type { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import {
  getLifiRouteStepLabel,
  getLifiRouteToolsDetails,
  getLifiToolDetails,
} from '../../../util/LifiRouteUtils';
import { useRouteStore } from '../hooks/useRouteStore';
import { BadgeType, Route, RouteStep } from './Route';

// Simplified LifiRoute component that handles only one route
export function LifiRoute({
  type,
  route,
  tags: routeTags,
  overrideToken,
}: {
  type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest';
  route: LifiCrosschainTransfersRoute;
  tags?: BadgeType[];
  overrideToken?: ERC20BridgeToken | undefined;
}) {
  const { selectedRoute, setSelectedRoute, isLoading } = useRouteStore(
    (state) => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute,
      isLoading: state.isLoading,
    }),
    shallow,
  );
  const isSelected = selectedRoute === type;
  const lifiRoute = route.protocolData.route;
  const routeTools = useMemo(() => getLifiRouteToolsDetails(lifiRoute), [lifiRoute]);
  const primaryTool = routeTools[0];
  const routeSteps: RouteStep[] = useMemo(
    () =>
      lifiRoute.steps.map((step) => {
        const toolDetails = getLifiToolDetails(step.toolDetails);

        return {
          id: step.id,
          label: getLifiRouteStepLabel(step),
          via: toolDetails.name,
          iconURI: toolDetails.logoURI,
          fromAmount: step.action.fromAmount,
          fromToken: step.action.fromToken,
          toAmount: step.estimate.toAmount,
          toToken: step.action.toToken,
        };
      }),
    [lifiRoute],
  );
  const tags = useMemo(() => {
    const nextTags = [...(routeTags ?? [])];
    if (lifiRoute.steps.length > 1) {
      nextTags.push('multi-step');
    }
    return nextTags;
  }, [routeTags, lifiRoute]);

  return (
    <Route
      type={type}
      bridge={primaryTool.name}
      bridgeIconURI={primaryTool.logoURI}
      durationMs={route.durationMs}
      amountReceived={utils.formatUnits(route.toAmount.amount, route.toAmount.token.decimals)}
      overrideToken={overrideToken}
      isLoadingGasEstimate={false}
      gasCost={route.gas}
      bridgeFee={route.fee}
      routeTools={routeTools}
      routeSteps={routeSteps}
      selected={isSelected}
      onSelectedRouteClick={setSelectedRoute}
      tag={tags.length > 0 ? tags : undefined}
      isDisabled={isLoading}
    />
  );
}

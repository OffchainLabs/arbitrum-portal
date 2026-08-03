import { utils } from 'ethers';
import { shallow } from 'zustand/shallow';

import type { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi';
import type { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import {
  getLifiRouteStepLabel,
  getLifiRouteToolDetails,
  getLifiRouteToolsDetails,
  getLifiToolDetails,
} from '../../../util/LifiRouteUtils';
import { useRouteStore } from '../hooks/useRouteStore';
import { BadgeType, Route, RouteStep, RouteTool } from './Route';

// Simplified LifiRoute component that handles only one route
export function LifiRoute({
  type,
  route,
  tag,
  overrideToken,
}: {
  type: 'lifi' | 'lifi-fastest' | 'lifi-cheapest';
  route: LifiCrosschainTransfersRoute;
  tag?: BadgeType | BadgeType[];
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
  const primaryTool = getLifiRouteToolDetails(lifiRoute);

  const routeTools: RouteTool[] = getLifiRouteToolsDetails(lifiRoute).map((tool) => ({
    id: tool.key,
    name: tool.name,
    iconURI: tool.logoURI,
  }));
  const routeSteps: RouteStep[] = lifiRoute.steps.map((step, stepIndex) => {
    const toolDetails = getLifiToolDetails(step.toolDetails);

    return {
      id: step.id || `lifi-route-step-${stepIndex}`,
      label: getLifiRouteStepLabel(step),
      via: toolDetails.name,
      iconURI: toolDetails.logoURI,
      fromAmount: step.action.fromAmount,
      fromToken: step.action.fromToken,
      toAmount: step.estimate.toAmount,
      toToken: step.action.toToken,
    };
  });
  const tags = Array.isArray(tag) ? [...tag] : tag ? [tag] : [];
  if (lifiRoute.steps.length > 1) {
    tags.push('multi-step');
  }

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

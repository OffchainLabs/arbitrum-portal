import { constants } from 'ethers';
import { useEffect, useMemo } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { shallow } from 'zustand/shallow';

import { Order } from '../../../app/api/crosschain-transfers/lifi';
import { getTokenOverride } from '../../../app/api/crosschain-transfers/utils';
import { isValidLifiTransfer } from '../../../app/api/crosschain-transfers/utils';
import { ContractStorage, ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useLifiCrossTransfersRoute } from '../../../hooks/useLifiCrossTransferRoute';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { isLifiEnabled as isLifiEnabledUtil } from '../../../util/featureFlag';
import { isNetwork } from '../../../util/networks';
import { useTokensFromLists } from '../TokenSearchUtils';
import { useAmountBigNumber } from '../hooks/useAmountBigNumber';
import { useIsArbitrumCanonicalTransfer } from '../hooks/useIsCanonicalTransfer';
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer';
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer';
import { defaultSlippage, useLifiSettingsStore } from '../hooks/useLifiSettingsStore';
import {
  RouteContext,
  RouteData,
  RouteType,
  getContextFromRoute,
  isLifiRoute,
  useRouteStore,
} from './useRouteStore';

/**
 * Determines the best route based on priority order.
 *
 * Route Selection Priority:
 * 1. OFT V2 (highest priority) - LayerZero protocol for USDT transfers
 * 2. CCTP (second priority) - Circle's native USDC transfers
 * 3. LiFi cheapest (third priority) - Best deal from LiFi aggregator
 * 4. LiFi single route (fourth priority) - When fastest and cheapest are the same
 * 5. First available route (fallback) - Any other route that was successfully fetched
 *
 * @param routes - Array of successfully fetched routes
 * @returns The best route type or undefined if no routes available
 */
function getBestRouteForDefaultSelection(routes: RouteData[]): RouteType | undefined {
  // 1. OFT V2 (highest priority)
  const oftV2Route = routes.find((route) => route.type === 'oftV2');
  if (oftV2Route) return 'oftV2';

  // 2. CCTP (second priority)
  const cctpRoute = routes.find((route) => route.type === 'cctp');
  if (cctpRoute) return 'cctp';

  // 3. LiFi best deal (third priority)
  const lifiCheapestRoute = routes.find((route) => route.type === 'lifi-cheapest');
  if (lifiCheapestRoute) return 'lifi-cheapest';

  const lifiFastestRoute = routes.find((route) => route.type === 'lifi-fastest');
  if (lifiFastestRoute) return 'lifi-fastest';

  const lifiRoute = routes.find((route) => route.type === 'lifi');
  if (lifiRoute) return 'lifi';

  // 4. First available route (fallback)
  return routes[0]?.type;
}

interface GetEligibleRoutesParams {
  isOftV2Transfer: boolean;
  isNativeUsdcTransfer: boolean;
  amount: string;
  isDepositMode: boolean;
  sourceChainId: number;
  destinationChainId: number;
  selectedToken: ERC20BridgeToken | null;
  isArbitrumCanonicalTransfer: boolean;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
}

function getEligibleRoutes({
  isOftV2Transfer,
  isNativeUsdcTransfer,
  amount,
  isDepositMode,
  sourceChainId,
  destinationChainId,
  selectedToken,
  isArbitrumCanonicalTransfer,
  tokensFromLists,
}: GetEligibleRoutesParams): RouteType[] {
  const { isTestnet } = isNetwork(sourceChainId);
  const isLifiEnabled = isLifiEnabledUtil() && !isTestnet;
  const eligibleRouteTypes: RouteType[] = [];

  if (Number(amount) === 0) {
    return [];
  }

  if (isOftV2Transfer) {
    eligibleRouteTypes.push('oftV2');
    return eligibleRouteTypes;
  }

  if (isNativeUsdcTransfer) {
    eligibleRouteTypes.push('cctp');

    if (isLifiEnabled) {
      eligibleRouteTypes.push('lifi');
    }

    if (isDepositMode) {
      eligibleRouteTypes.push('arbitrum');
    }

    return eligibleRouteTypes;
  }

  const isValidLifiRoute =
    isLifiEnabled &&
    isValidLifiTransfer({
      fromToken: selectedToken?.address,
      sourceChainId: sourceChainId,
      destinationChainId: destinationChainId,
      tokensFromLists,
    });

  if (isValidLifiRoute) {
    eligibleRouteTypes.push('lifi');
  }

  if (isArbitrumCanonicalTransfer) {
    eligibleRouteTypes.push('arbitrum');
  }

  return eligibleRouteTypes;
}

export function useRoutesUpdater() {
  const [networks] = useNetworks();
  const { isDepositMode } = useNetworksRelationship(networks);
  const [{ amount }] = useArbQueryParams();
  const isNativeUsdcTransfer = useIsCctpTransfer();
  const isOftV2Transfer = useIsOftV2Transfer();
  const [selectedToken] = useSelectedToken();
  const destinationToken = useDestinationToken();
  const tokensFromLists = useTokensFromLists();
  const { address } = useAccount();
  const [{ destinationAddress }] = useArbQueryParams();
  const amountBN = useAmountBigNumber();
  const { disabledBridges, disabledExchanges, slippage } = useLifiSettingsStore(
    (state) => ({
      disabledBridges: state.disabledBridges,
      disabledExchanges: state.disabledExchanges,
      slippage: state.slippage,
    }),
    shallow,
  );

  const isArbitrumCanonicalTransfer = useIsArbitrumCanonicalTransfer();
  const { setRouteState, userSelectedRoute } = useRouteStore(
    (state) => ({
      setRouteState: state.setRouteState,
      userSelectedRoute: state.userSelectedRoute,
    }),
    shallow,
  );

  const eligibleRouteTypes = useMemo(
    () =>
      getEligibleRoutes({
        isOftV2Transfer,
        isNativeUsdcTransfer,
        amount,
        isDepositMode,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        selectedToken,
        isArbitrumCanonicalTransfer,
        tokensFromLists,
      }),
    [
      isOftV2Transfer,
      isNativeUsdcTransfer,
      amount,
      isDepositMode,
      networks.sourceChain.id,
      networks.destinationChain.id,
      selectedToken,
      isArbitrumCanonicalTransfer,
      tokensFromLists,
    ],
  );

  const overrideSourceToken = useMemo(
    () =>
      getTokenOverride({
        sourceChainId: networks.sourceChain.id,
        fromToken: selectedToken?.address,
        destinationChainId: networks.destinationChain.id,
      }),
    [selectedToken?.address, networks.sourceChain.id, networks.destinationChain.id],
  );
  const overrideDestinationToken = useMemo(
    () =>
      getTokenOverride({
        sourceChainId: networks.sourceChain.id,
        fromToken: destinationToken?.address,
        destinationChainId: networks.destinationChain.id,
      }),
    [destinationToken?.address, networks.sourceChain.id, networks.destinationChain.id],
  );

  const lifiParameters = {
    enabled: eligibleRouteTypes.includes('lifi'), // only fetch lifi routes if lifi is eligible
    fromAddress: address,
    fromAmount: amountBN.toString(),
    fromChainId: networks.sourceChain.id,
    fromToken:
      (isDepositMode ? selectedToken?.address : selectedToken?.l2Address) ||
      overrideSourceToken.source?.address ||
      constants.AddressZero,
    toAddress: (destinationAddress as Address) || address,
    toChainId: networks.destinationChain.id,
    toToken:
      (isDepositMode ? destinationToken?.l2Address : destinationToken?.address) ||
      overrideDestinationToken.destination?.address ||
      constants.AddressZero,
    denyBridges: disabledBridges,
    denyExchanges: disabledExchanges,
    slippage,
  };

  const {
    data: lifiRoutes,
    isLoading: isLifiLoading,
    error: lifiError,
  } = useLifiCrossTransfersRoute(lifiParameters);

  const routeData = useMemo(() => {
    const routes: RouteData[] = [];

    // OFT V2 route data
    if (eligibleRouteTypes.includes('oftV2')) {
      routes.push({
        type: 'oftV2',
        data: {
          amountReceived: amount,
        },
      });
    }

    // CCTP route data
    if (eligibleRouteTypes.includes('cctp')) {
      routes.push({
        type: 'cctp',
        data: {
          amountReceived: amount,
        },
      });
    }

    // LiFi route data - handle fastest/cheapest consolidation
    if (eligibleRouteTypes.includes('lifi') && lifiRoutes) {
      const cheapestRoute = lifiRoutes.find((route) =>
        route.protocolData.orders.find((order) => order === Order.Cheapest),
      );
      const fastestRoute = lifiRoutes.find((route) =>
        route.protocolData.orders.find((order) => order === Order.Fastest),
      );

      // Check if fastest and cheapest are the same route
      const isSameRoute = cheapestRoute && fastestRoute && cheapestRoute === fastestRoute;

      if (isSameRoute) {
        // Single route with both fastest and cheapest tags
        routes.push({
          type: 'lifi',
          data: {
            route: cheapestRoute,
          },
        });
      } else {
        // Separate routes for fastest and cheapest
        if (cheapestRoute) {
          routes.push({
            type: 'lifi-cheapest',
            data: {
              route: cheapestRoute,
            },
          });
        }

        if (fastestRoute) {
          routes.push({
            type: 'lifi-fastest',
            data: {
              route: fastestRoute,
            },
          });
        }
      }
    }

    // Arbitrum canonical route data
    if (eligibleRouteTypes.includes('arbitrum')) {
      routes.push({
        type: 'arbitrum',
        data: {
          amountReceived: amount,
        },
      });
    }

    return routes;
  }, [eligibleRouteTypes, lifiRoutes, amount]);

  const flags = useMemo(
    () => ({
      hasLowLiquidity:
        // Only true if:
        // 1. LiFi is the ONLY eligible route
        // 2. LiFi fetcher response was successful (no error)
        // 3. LiFi response contains no routes
        eligibleRouteTypes.includes('lifi') &&
        eligibleRouteTypes.length === 1 &&
        !isLifiLoading &&
        !lifiError &&
        routeData.length === 0,
      hasModifiedSettings:
        // Check if user has modified default settings
        slippage !== defaultSlippage.toString() ||
        disabledExchanges.length > 0 ||
        disabledBridges.length > 0,
    }),
    [
      eligibleRouteTypes,
      lifiError,
      isLifiLoading,
      slippage,
      disabledExchanges,
      disabledBridges,
      routeData,
    ],
  );

  // Only show error if ALL routes fail (LiFi is the only route and it failed)
  const hasError =
    lifiError && eligibleRouteTypes.includes('lifi') && eligibleRouteTypes.length === 1;

  useEffect(() => {
    // if user has not selected a route, then pre-select the best route
    const selectedRoute =
      userSelectedRoute && routeData.some((route) => route.type === userSelectedRoute)
        ? userSelectedRoute // User selection is valid - preserve it
        : getBestRouteForDefaultSelection(routeData); // Auto-select best route - becomes default selection

    // Compute context for LiFi routes, but only after loading completes to ensure button stays disabled during loading
    let context: RouteContext | undefined = undefined;
    if (!isLifiLoading && selectedRoute && isLifiRoute(selectedRoute)) {
      const selectedRouteData = routeData.find((route) => route.type === selectedRoute);
      if (selectedRouteData && 'route' in selectedRouteData.data) {
        context = getContextFromRoute(selectedRouteData.data.route);
      }
    }

    setRouteState({
      eligibleRouteTypes,
      isLoading: isLifiLoading,
      error: hasError ? `Routes failed to load: ${lifiError?.message || 'Unknown error'}` : null,

      routes: routeData,
      hasLowLiquidity: flags.hasLowLiquidity,
      hasModifiedSettings: flags.hasModifiedSettings,
      selectedRoute,
      context,
    });
  }, [
    eligibleRouteTypes,
    isLifiLoading,
    hasError,
    lifiError,
    routeData,
    flags,
    setRouteState,
    userSelectedRoute,
  ]);
}

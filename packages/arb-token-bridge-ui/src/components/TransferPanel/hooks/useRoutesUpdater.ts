import { constants } from 'ethers';
import { useEffect, useMemo } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { shallow } from 'zustand/shallow';

import { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi';
import { getTokenOverride, isValidLifiTransfer } from '../../../app/api/crosschain-transfers/utils';
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported';
import { ContractStorage, ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import { AmountQueryParamEnum, useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useDestinationToken } from '../../../hooks/useDestinationToken';
import { useLifiCrossTransfersRoute } from '../../../hooks/useLifiCrossTransferRoute';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { ChainId } from '../../../types/ChainId';
import { addressesEqual } from '../../../util/AddressUtils';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { isLifiOnlyToken } from '../../../util/TokenListUtils';
import {
  isCctpEnabled as isCctpEnabledUtil,
  isLifiEnabled as isLifiEnabledUtil,
} from '../../../util/featureFlag';
import { isNetwork } from '../../../util/networks';
import { useTokensFromLists } from '../TokenSearchUtils';
import { useAmountBigNumber } from '../hooks/useAmountBigNumber';
import { useIsArbitrumCanonicalTransfer } from '../hooks/useIsCanonicalTransfer';
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer';
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer';
import { defaultSlippage, useLifiSettingsStore } from '../hooks/useLifiSettingsStore';
import { EligibleRouteType, RouteData, RouteType, useRouteStore } from './useRouteStore';

/**
 * Determines the best route based on priority order.
 *
 * Route Selection Priority:
 * 1. OFT V2 (highest priority) - LayerZero protocol for supported OFT tokens
 *    (excluded when swapping from USDT to a different token)
 * 2. CCTP (second priority) - Circle's native USDC transfers
 * 3. LiFi cheapest (third priority) - Best deal from LiFi aggregator
 * 4. LiFi single route (fourth priority) - When fastest and cheapest are the same
 * 5. Arbitrum canonical route (fallback)
 *
 * @param routes - Array of successfully fetched routes
 * @returns The best route type or undefined if no routes available
 */
function getBestRouteForDefaultSelection(routes: RouteData[]): RouteType | undefined {
  const routePriority: RouteType[] = ['oftV2', 'cctp', 'lifi-cheapest', 'lifi', 'arbitrum'];

  return routePriority.find((routeType) => routes.some((route) => route.type === routeType));
}

export function getSelectedRouteForAvailableRoutes(
  userSelectedRoute: RouteType | undefined,
  routes: RouteData[],
): RouteType | undefined {
  return userSelectedRoute && routes.some((route) => route.type === userSelectedRoute)
    ? userSelectedRoute
    : getBestRouteForDefaultSelection(routes);
}

export function hasLowLifiLiquidity({
  eligibleRouteTypes,
  isLoading,
  error,
  routes,
}: {
  eligibleRouteTypes: EligibleRouteType[];
  isLoading: boolean;
  error: Error | undefined;
  routes: LifiCrosschainTransfersRoute[] | undefined;
}) {
  return (
    eligibleRouteTypes.includes('lifi') &&
    eligibleRouteTypes.length === 1 &&
    !isLoading &&
    !error &&
    routes?.length === 0
  );
}

export interface GetEligibleRoutesParams {
  isOftV2Transfer: boolean;
  isNativeUsdcTransfer: boolean;
  isCctpEnabled: boolean;
  isBatchTransfer: boolean;
  amount: string;
  isDepositMode: boolean;
  sourceChainId: number;
  destinationChainId: number;
  selectedToken: ERC20BridgeToken | null;
  destinationToken: ERC20BridgeToken | null;
  isArbitrumCanonicalTransfer: boolean;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
}

export function getEligibleRoutes({
  isOftV2Transfer,
  isNativeUsdcTransfer,
  isCctpEnabled,
  isBatchTransfer,
  amount,
  isDepositMode,
  sourceChainId,
  destinationChainId,
  selectedToken,
  destinationToken,
  isArbitrumCanonicalTransfer,
  tokensFromLists,
}: GetEligibleRoutesParams): EligibleRouteType[] {
  const { isTestnet } = isNetwork(sourceChainId);
  const isLifiEnabled = isLifiEnabledUtil() && !isTestnet;
  const eligibleRouteTypes: EligibleRouteType[] = [];

  if (Number(amount) === 0) {
    return [];
  }

  const hasLifiOnlyToken = isLifiOnlyToken(selectedToken) || isLifiOnlyToken(destinationToken);
  if (hasLifiOnlyToken) {
    if (isBatchTransfer || !isLifiEnabled) {
      return [];
    }

    return isValidLifiTransfer({
      fromToken: selectedToken?.address,
      sourceChainId,
      destinationChainId,
      tokensFromLists,
    })
      ? ['lifi']
      : [];
  }

  const isCanonicalVirtualWithdrawal =
    sourceChainId === ChainId.RobinhoodChain &&
    destinationChainId === ChainId.Ethereum &&
    addressesEqual(selectedToken?.l2Address, CommonAddress.RobinhoodChain.VIRTUAL_CANONICAL);

  // Only the canonical route can carry the extra native amount (as the retryable's
  // L2 callvalue), so skip LiFi/CCTP/OFT quotes for batches.
  if (isBatchTransfer) {
    return isArbitrumCanonicalTransfer ? ['arbitrum'] : [];
  }

  if (isOftV2Transfer) {
    eligibleRouteTypes.push('oftV2');

    if (isLifiEnabled) {
      const isValidLifiRoute = isValidLifiTransfer({
        fromToken: selectedToken?.address,
        sourceChainId: sourceChainId,
        destinationChainId: destinationChainId,
        tokensFromLists,
      });

      if (isValidLifiRoute) {
        eligibleRouteTypes.push('lifi');
      }
    }

    return eligibleRouteTypes;
  }

  if (isNativeUsdcTransfer) {
    if (isCctpEnabled) {
      eligibleRouteTypes.push('cctp');
    }

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
    !isCanonicalVirtualWithdrawal &&
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
  const [{ amount, amount2 }] = useArbQueryParams();
  const isNativeUsdcTransfer = useIsCctpTransfer();
  const isCctpEnabled = isCctpEnabledUtil();
  const isOftV2Transfer = useIsOftV2Transfer();
  const isBatchTransferSupported = useIsBatchTransferSupported();
  // `amount2` can be the literal "max" deep-link value, which resolves to a positive amount.
  const isBatchTransfer =
    isBatchTransferSupported && (amount2 === AmountQueryParamEnum.MAX || Number(amount2) > 0);
  const [selectedToken] = useSelectedToken();
  const destinationToken = useDestinationToken();
  const { data: tokensFromLists } = useTokensFromLists();
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
        isCctpEnabled,
        isBatchTransfer,
        amount,
        isDepositMode,
        sourceChainId: networks.sourceChain.id,
        destinationChainId: networks.destinationChain.id,
        selectedToken,
        destinationToken,
        isArbitrumCanonicalTransfer,
        tokensFromLists,
      }),
    [
      isOftV2Transfer,
      isNativeUsdcTransfer,
      isCctpEnabled,
      isBatchTransfer,
      amount,
      isDepositMode,
      networks.sourceChain.id,
      networks.destinationChain.id,
      selectedToken,
      destinationToken,
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

  const defaultFromTokenAddress = isDepositMode ? selectedToken?.address : selectedToken?.l2Address;
  const defaultToTokenAddress = isDepositMode
    ? destinationToken?.l2Address
    : destinationToken?.address;

  const fromTokenAddress =
    overrideSourceToken.source?.address || defaultFromTokenAddress || constants.AddressZero;
  const toTokenAddress =
    overrideDestinationToken.destination?.address || defaultToTokenAddress || constants.AddressZero;

  const lifiParameters = {
    enabled: eligibleRouteTypes.includes('lifi'), // only fetch lifi routes if lifi is eligible
    fromAddress: address,
    fromAmount: amountBN.toString(),
    fromChainId: networks.sourceChain.id,
    fromToken: fromTokenAddress,
    toAddress: (destinationAddress as Address) || address,
    toChainId: networks.destinationChain.id,
    toToken: toTokenAddress,
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
        amountReceived: amount,
      });
    }

    // CCTP route data
    if (eligibleRouteTypes.includes('cctp')) {
      routes.push({
        type: 'cctp',
        amountReceived: amount,
      });
    }

    // LiFi route data - handle fastest/cheapest consolidation
    if (eligibleRouteTypes.includes('lifi') && lifiRoutes?.length) {
      const [cheapestRoute, fastestRoute = cheapestRoute] = lifiRoutes;

      if (lifiRoutes.length === 1) {
        routes.push({
          type: 'lifi',
          route: cheapestRoute,
        });
      } else {
        routes.push({
          type: 'lifi-cheapest',
          route: cheapestRoute,
        });
        routes.push({
          type: 'lifi-fastest',
          route: fastestRoute,
        });
      }
    }

    // Arbitrum canonical route data
    if (eligibleRouteTypes.includes('arbitrum')) {
      routes.push({
        type: 'arbitrum',
        amountReceived: amount,
      });
    }

    return routes;
  }, [eligibleRouteTypes, lifiRoutes, amount]);

  // Only true if:
  // 1. LiFi is the ONLY eligible route
  // 2. LiFi fetcher response was successful (no error)
  // 3. LiFi response contains no routes
  const hasLowLiquidity = hasLowLifiLiquidity({
    eligibleRouteTypes,
    isLoading: isLifiLoading,
    error: lifiError,
    routes: lifiRoutes,
  });
  // Check if user has modified default settings
  const hasModifiedSettings =
    slippage !== defaultSlippage.toString() ||
    disabledExchanges.length > 0 ||
    disabledBridges.length > 0;

  // Only show error if ALL routes fail (LiFi is the only route and it failed)
  const hasError =
    lifiError && eligibleRouteTypes.includes('lifi') && eligibleRouteTypes.length === 1;

  useEffect(() => {
    // if user has not selected a route, then pre-select the best route
    const selectedRoute = getSelectedRouteForAvailableRoutes(userSelectedRoute, routeData);

    setRouteState({
      eligibleRouteTypes,
      isLoading: isLifiLoading,
      error: hasError ? `Routes failed to load: ${lifiError?.message || 'Unknown error'}` : null,

      routes: routeData,
      hasLowLiquidity,
      hasModifiedSettings,
      selectedRoute,
    });
  }, [
    eligibleRouteTypes,
    isLifiLoading,
    hasError,
    lifiError,
    routeData,
    hasLowLiquidity,
    hasModifiedSettings,
    setRouteState,
    userSelectedRoute,
  ]);
}

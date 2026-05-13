import { BigNumber, constants, utils } from 'ethers';
import { useMemo } from 'react';
import useSWR from 'swr';
import { Address } from 'viem';
import { Config, useAccount, useConfig } from 'wagmi';
import { shallow } from 'zustand/shallow';

import { TransferEstimateGasResult } from '@/token-bridge-sdk/BridgeTransferStarter';
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory';
import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter';
import { LifiTransferStarter } from '@/token-bridge-sdk/LifiTransferStarter';
import { OftV2TransferStarter } from '@/token-bridge-sdk/OftV2TransferStarter';
import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { LifiCrosschainTransfersRoute, Order } from '../../app/api/crosschain-transfers/lifi';
import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { useLifiSettingsStore } from '../../components/TransferPanel/hooks/useLifiSettingsStore';
import {
  RouteContext,
  RouteType,
  getContextFromRoute,
  isLifiRoute,
  useRouteStore,
} from '../../components/TransferPanel/hooks/useRouteStore';
import { useArbQueryParams } from '../useArbQueryParams';
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain';
import { useDestinationToken } from '../useDestinationToken';
import {
  UseLifiCrossTransfersRouteParams,
  useLifiCrossTransfersRoute,
} from '../useLifiCrossTransferRoute';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { useSelectedToken } from '../useSelectedToken';

function getLifiRouteByType({
  routeType,
  lifiRoutes,
}: {
  routeType: RouteType;
  lifiRoutes: LifiCrosschainTransfersRoute[] | undefined;
}) {
  if (!lifiRoutes?.length || !isLifiRoute(routeType)) {
    return undefined;
  }

  if (routeType === 'lifi') {
    return (
      lifiRoutes.find(
        (route) =>
          route.protocolData.orders.includes(Order.Cheapest) &&
          route.protocolData.orders.includes(Order.Fastest),
      ) ?? lifiRoutes[0]
    );
  }

  if (routeType === 'lifi-cheapest') {
    return lifiRoutes.find((route) => route.protocolData.orders.includes(Order.Cheapest));
  }

  if (routeType === 'lifi-fastest') {
    return lifiRoutes.find((route) => route.protocolData.orders.includes(Order.Fastest));
  }

  return undefined;
}

async function fetcher([
  routeType,
  walletAddress,
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address,
  destinationChainErc20Address,
  destinationAddress,
  amount,
  wagmiConfig,
  routeContext,
]: [
  routeType: RouteType,
  walletAddress: string | undefined,
  sourceChainId: number,
  destinationChainId: number,
  sourceChainErc20Address: string | undefined,
  destinationChainErc20Address: string | undefined,
  destinationAddress: string | undefined,
  amount: BigNumber,
  wagmiConfig: Config,
  routeContext: RouteContext | undefined,
]): Promise<TransferEstimateGasResult> {
  const _walletAddress = walletAddress ?? constants.AddressZero;
  const sourceProvider = getProviderForChainId(sourceChainId);
  const destinationProvider = getProviderForChainId(destinationChainId);
  const signer = sourceProvider.getSigner(_walletAddress);
  let bridgeTransferStarter;

  if (isLifiRoute(routeType)) {
    if (!routeContext) {
      return undefined;
    }

    bridgeTransferStarter = new LifiTransferStarter({
      sourceChainProvider: sourceProvider,
      sourceChainErc20Address,
      destinationChainProvider: destinationProvider,
      destinationChainErc20Address,
      lifiData: routeContext,
    });
  } else if (routeType === 'cctp') {
    bridgeTransferStarter = new CctpTransferStarter({
      sourceChainProvider: sourceProvider,
      sourceChainErc20Address,
      destinationChainProvider: destinationProvider,
      destinationChainErc20Address,
    });
  } else if (routeType === 'oftV2') {
    bridgeTransferStarter = new OftV2TransferStarter({
      sourceChainProvider: sourceProvider,
      sourceChainErc20Address,
      destinationChainProvider: destinationProvider,
      destinationChainErc20Address,
    });
  } else {
    // canonical / teleport
    bridgeTransferStarter = BridgeTransferStarterFactory.create({
      sourceChainId,
      sourceChainErc20Address,
      destinationChainId,
      destinationChainErc20Address,
    });
  }

  return await bridgeTransferStarter.transferEstimateGas({
    amount,
    from: await signer.getAddress(),
    destinationAddress,
    wagmiConfig,
  });
}

export function useGasEstimates({
  sourceChainErc20Address,
  destinationChainErc20Address,
  amount,
}: {
  sourceChainErc20Address?: string;
  destinationChainErc20Address?: string;
  amount: BigNumber;
}): {
  gasEstimates: TransferEstimateGasResult;
  error: any;
} {
  const [networks] = useNetworks();
  const { sourceChain, destinationChain } = networks;
  const { isDepositMode } = useNetworksRelationship(networks);
  const [selectedToken] = useSelectedToken();
  const destinationToken = useDestinationToken();
  const destinationTokenForGas = destinationToken ?? selectedToken;
  const [{ destinationAddress }] = useArbQueryParams();
  const { address: walletAddress } = useAccount();
  const balance = useBalanceOnSourceChain(selectedToken);
  const wagmiConfig = useConfig();
  const { eligibleRouteTypes, selectedRoute, context } = useRouteStore(
    (state) => ({
      eligibleRouteTypes: state.eligibleRouteTypes,
      selectedRoute: state.selectedRoute,
      context: state.context,
    }),
    shallow,
  );
  const routeTypeForGasEstimate = useMemo(() => {
    if (
      selectedRoute &&
      (eligibleRouteTypes.includes(selectedRoute) ||
        (isLifiRoute(selectedRoute) && eligibleRouteTypes.includes('lifi')))
    ) {
      return selectedRoute;
    }

    return eligibleRouteTypes[0];
  }, [eligibleRouteTypes, selectedRoute]);
  const isLifiRouteEligible = eligibleRouteTypes.includes('lifi');

  const overrideSourceToken = useMemo(
    () =>
      getTokenOverride({
        sourceChainId: sourceChain.id,
        fromToken: selectedToken?.address,
        destinationChainId: destinationChain.id,
      }),
    [selectedToken?.address, sourceChain.id, destinationChain.id],
  );
  const overrideDestinationToken = useMemo(
    () =>
      getTokenOverride({
        sourceChainId: sourceChain.id,
        fromToken: destinationTokenForGas?.address,
        destinationChainId: destinationChain.id,
      }),
    [destinationTokenForGas?.address, sourceChain.id, destinationChain.id],
  );
  const { disabledBridges, disabledExchanges, slippage } = useLifiSettingsStore(
    (state) => ({
      disabledBridges: state.disabledBridges,
      disabledExchanges: state.disabledExchanges,
      slippage: state.slippage,
    }),
    shallow,
  );

  const defaultFromTokenAddress = isDepositMode ? selectedToken?.address : selectedToken?.l2Address;
  const defaultToTokenAddress = isDepositMode
    ? destinationTokenForGas?.l2Address
    : destinationTokenForGas?.address;

  const fromTokenAddress =
    overrideSourceToken.source?.address || defaultFromTokenAddress || constants.AddressZero;
  const toTokenAddress =
    overrideDestinationToken.destination?.address || defaultToTokenAddress || constants.AddressZero;

  const parameters = {
    enabled: isLifiRouteEligible,
    fromAddress: walletAddress,
    fromAmount: amount.toString(),
    fromChainId: sourceChain.id,
    fromToken: fromTokenAddress,
    toAddress: (destinationAddress as Address) || walletAddress,
    toChainId: destinationChain.id,
    toToken: toTokenAddress,
    denyBridges: disabledBridges,
    denyExchanges: disabledExchanges,
    slippage,
  } satisfies Omit<UseLifiCrossTransfersRouteParams, 'order'>;

  const { data: lifiRoutes, isLoading: isLoadingLifiRoutes } =
    useLifiCrossTransfersRoute(parameters);

  const amountToTransfer = balance !== null && amount.gte(balance) ? balance : amount;

  const sanitizedDestinationAddress = utils.isAddress(String(destinationAddress))
    ? destinationAddress
    : undefined;

  const { data: gasEstimates, error } = useSWR(
    () => {
      if (!routeTypeForGasEstimate) {
        return null;
      }

      const isRouteLifi = isLifiRoute(routeTypeForGasEstimate);

      let routeContext: RouteContext | undefined = undefined;
      if (isRouteLifi) {
        if (selectedRoute === routeTypeForGasEstimate && context) {
          routeContext = context;
        } else {
          if (isLoadingLifiRoutes || !lifiRoutes?.length) {
            return null;
          }

          const selectedLifiRoute = getLifiRouteByType({
            routeType: routeTypeForGasEstimate,
            lifiRoutes,
          });
          if (!selectedLifiRoute) {
            return null;
          }

          routeContext = getContextFromRoute(selectedLifiRoute);
        }
      }

      if (isRouteLifi && !routeContext) {
        return null;
      }

      return [
        routeTypeForGasEstimate,
        sourceChain.id,
        destinationChain.id,
        sourceChainErc20Address,
        destinationChainErc20Address,
        amountToTransfer.toString(), // BigNumber is not serializable
        sanitizedDestinationAddress,
        walletAddress,
        wagmiConfig,
        routeContext,
        'gasEstimates',
      ] as const;
    },
    ([
      _routeType,
      _sourceChainId,
      _destinationChainId,
      _sourceChainErc20Address,
      _destinationChainErc20Address,
      _amount,
      _destinationAddress,
      _walletAddress,
      _wagmiConfig,
      _routeContext,
    ]) =>
      fetcher([
        _routeType,
        _walletAddress,
        _sourceChainId,
        _destinationChainId,
        _sourceChainErc20Address,
        _destinationChainErc20Address,
        _destinationAddress,
        BigNumber.from(_amount),
        _wagmiConfig,
        _routeContext,
      ]),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
    },
  );

  return { gasEstimates, error };
}

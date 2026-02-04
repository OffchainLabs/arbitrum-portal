import { BigNumber, constants, utils } from 'ethers';
import { useMemo } from 'react';
import useSWR from 'swr';
import { Address } from 'viem';
import { Config, useAccount, useConfig } from 'wagmi';
import { shallow } from 'zustand/shallow';

import { TransferEstimateGasResult } from '@/token-bridge-sdk/BridgeTransferStarter';
import { BridgeTransferStarterFactory } from '@/token-bridge-sdk/BridgeTransferStarterFactory';
import { getProviderForChainId } from '@/token-bridge-sdk/utils';

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

async function fetcher([
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
  const signer = sourceProvider.getSigner(_walletAddress);
  // use chainIds to initialize the bridgeTransferStarter to save RPC calls
  const bridgeTransferStarter = BridgeTransferStarterFactory.create({
    sourceChainId,
    sourceChainErc20Address,
    destinationChainId,
    destinationChainErc20Address,
    lifiData: routeContext,
  });

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
  const { context, eligibleRouteTypes } = useRouteStore(
    (state) => ({
      context: state.context,
      eligibleRouteTypes: state.eligibleRouteTypes,
    }),
    shallow,
  );
  const allRoutesAreLifi = useMemo(
    () => eligibleRouteTypes.every((route: RouteType) => isLifiRoute(route)),
    [eligibleRouteTypes],
  );
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
      if (allRoutesAreLifi && (isLoadingLifiRoutes || lifiRoutes?.length === 0)) {
        return null;
      }

      /**
       * If route is selected, pass context from that route
       * If no route are selected and it's a lifi only route (for example Base to Arbitrum One),
       * pass the first lifi route as context
       * Otherwise, default to canonical transfer
       */
      const lifiContext = allRoutesAreLifi
        ? lifiRoutes?.[0] && getContextFromRoute(lifiRoutes?.[0])
        : context;

      return [
        sourceChain.id,
        destinationChain.id,
        sourceChainErc20Address,
        destinationChainErc20Address,
        amountToTransfer.toString(), // BigNumber is not serializable
        sanitizedDestinationAddress,
        walletAddress,
        wagmiConfig,
        lifiContext,
        'gasEstimates',
      ] as const;
    },
    ([
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

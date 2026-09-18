import { BigNumber, constants } from 'ethers';
import { useMemo } from 'react';
import useSWR from 'swr';
import { shallow } from 'zustand/shallow';

import type { TransferEstimateGasResult } from '@/token-bridge-sdk/BridgeTransferStarter';

import { getTokenOverride } from '../../app/api/crosschain-transfers/utils';
import { useLifiSettingsStore } from '../../components/TransferPanel/hooks/useLifiSettingsStore';
import { useRouteStore } from '../../components/TransferPanel/hooks/useRouteStore';
import { BridgeTransferStarterFactory } from '../../token-bridge-sdk/BridgeTransferStarterFactory';
import { getSelectedRouteContext } from '../../util/TransferRouteUtils';
import { isValidAddressForChain } from '../../util/isValidAddressForChain';
import { wagmiConfig } from '../../util/wagmi/setup';
import { getNativeTokenAddress } from '../../wallet/constants';
import { useWallets } from '../../wallet/hooks/useWallets';
import { useArbQueryParams } from '../useArbQueryParams';
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain';
import { useDestinationSelection } from '../useDestinationToken';
import {
  UseLifiCrossTransfersRouteParams,
  useLifiCrossTransfersRoute,
} from '../useLifiCrossTransferRoute';
import { useNetworks } from '../useNetworks';
import { useNetworksRelationship } from '../useNetworksRelationship';
import { useSelectedToken } from '../useSelectedToken';

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
  // Quote the same destination as the route request so both agree on the received asset.
  const { destinationAddress: toTokenAddress } = useDestinationSelection();
  const [{ destinationAddress }] = useArbQueryParams();
  const {
    sourceWallet: {
      account: { address: walletAddress },
    },
    destinationWallet: {
      account: { address: destinationWalletAddress },
    },
  } = useWallets();
  const recipientAddress = destinationAddress || destinationWalletAddress;
  const balance = useBalanceOnSourceChain(selectedToken);
  const { selectedRouteContext, eligibleRouteTypes } = useRouteStore(
    (state) => ({
      selectedRouteContext: getSelectedRouteContext(state),
      eligibleRouteTypes: state.eligibleRouteTypes,
    }),
    shallow,
  );
  const allRoutesAreLifi = eligibleRouteTypes.length === 1 && eligibleRouteTypes[0] === 'lifi';
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
  const { disabledBridges, disabledExchanges, slippage } = useLifiSettingsStore(
    (state) => ({
      disabledBridges: state.disabledBridges,
      disabledExchanges: state.disabledExchanges,
      slippage: state.slippage,
    }),
    shallow,
  );

  const defaultFromTokenAddress = isDepositMode ? selectedToken?.address : selectedToken?.l2Address;
  const fromTokenAddress =
    overrideSourceToken.source?.address ||
    defaultFromTokenAddress ||
    getNativeTokenAddress(sourceChain.id);

  const parameters = {
    enabled: isLifiRouteEligible,
    fromAddress: walletAddress,
    fromAmount: amount.toString(),
    fromChainId: sourceChain.id,
    fromToken: fromTokenAddress,
    toAddress: recipientAddress,
    toChainId: destinationChain.id,
    toToken: toTokenAddress,
    denyBridges: disabledBridges,
    denyExchanges: disabledExchanges,
    slippage,
  } satisfies Omit<UseLifiCrossTransfersRouteParams, 'order'>;

  const { data: lifiRoutes, isLoading: isLoadingLifiRoutes } =
    useLifiCrossTransfersRoute(parameters);

  const amountToTransfer = balance !== null && amount.gte(balance) ? balance : amount;

  const sanitizedDestinationAddress =
    destinationAddress && isValidAddressForChain(destinationAddress, destinationChain.id)
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
      const lifiContext = allRoutesAreLifi ? lifiRoutes?.[0] : selectedRouteContext;

      return {
        sourceChainId: sourceChain.id,
        destinationChainId: destinationChain.id,
        sourceChainErc20Address,
        destinationChainErc20Address,
        amount: amountToTransfer.toString(),
        destinationAddress: sanitizedDestinationAddress,
        walletAddress,
        lifiRoute: lifiContext,
        key: 'gasEstimates',
      };
    },
    ({ amount, destinationAddress, walletAddress, ...route }) =>
      BridgeTransferStarterFactory.create(route).transferEstimateGas({
        amount: BigNumber.from(amount),
        from: walletAddress ?? constants.AddressZero,
        destinationAddress,
        wagmiConfig,
      }),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000,
    },
  );

  return { gasEstimates, error };
}

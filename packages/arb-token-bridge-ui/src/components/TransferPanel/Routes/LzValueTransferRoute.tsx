import { constants, utils } from 'ethers';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { ether } from '../../../constants';
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary';
import { useLzValueTransferFeeEstimates } from '../../../hooks/TransferPanel/useLzValueTransferFeeEstimates';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { useRouteStore } from '../hooks/useRouteStore';
import { Route } from './Route';

export function LzValueTransferRoute() {
  const [networks] = useNetworks();
  const { isDepositMode } = useNetworksRelationship(networks);
  const { selectedRoute, setSelectedRoute } = useRouteStore(
    (state) => ({
      selectedRoute: state.selectedRoute,
      setSelectedRoute: state.setSelectedRoute,
    }),
    shallow,
  );
  const [selectedToken] = useSelectedToken();

  const routeData = useRouteStore(
    (state) => state.routes.find((route) => route.type === 'lzValueTransfer')?.data,
  );

  const { feeEstimates, error: feeEstimatesError } = useLzValueTransferFeeEstimates({
    sourceChainErc20Address: isDepositMode ? selectedToken?.address : selectedToken?.l2Address,
  });
  const { estimatedChildChainGasFees, estimatedParentChainGasFees, status } = useGasSummary();

  const gasCost = useMemo(() => {
    if (
      status !== 'success' ||
      typeof estimatedParentChainGasFees !== 'number' ||
      typeof estimatedChildChainGasFees !== 'number'
    ) {
      return undefined;
    }

    return [
      {
        gasCost: isDepositMode
          ? utils.parseUnits(estimatedParentChainGasFees.toString(), 18).toString()
          : utils.parseUnits(estimatedChildChainGasFees.toString(), 18).toString(),
        gasToken: {
          ...ether,
          address: constants.AddressZero,
        },
      },
    ];
  }, [status, isDepositMode, estimatedParentChainGasFees, estimatedChildChainGasFees]);

  const bridgeFee = useMemo(() => {
    if (!feeEstimates?.sourceChainGasFee) {
      return undefined;
    }

    return {
      fee: feeEstimates.sourceChainGasFee.toString(),
      token: { ...ether, address: constants.AddressZero },
    };
  }, [feeEstimates?.sourceChainGasFee]);

  if (feeEstimatesError || !routeData) {
    return null;
  }

  return (
    <Route
      type="lzValueTransfer"
      bridge="LayerZero"
      bridgeIconURI="/icons/layerzero.svg"
      durationMs={5 * 60 * 1_000} // 5 minutes
      amountReceived={routeData.amountReceived}
      isLoadingGasEstimate={status === 'loading'}
      gasCost={gasCost}
      bridgeFee={bridgeFee}
      selected={selectedRoute === 'lzValueTransfer'}
      onSelectedRouteClick={setSelectedRoute}
    />
  );
}

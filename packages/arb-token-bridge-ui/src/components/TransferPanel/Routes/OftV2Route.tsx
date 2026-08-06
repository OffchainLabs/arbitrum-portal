import { constants, utils } from 'ethers';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import { ether } from '../../../constants';
import { useGasSummary } from '../../../hooks/TransferPanel/useGasSummary';
import { useOftV2FeeEstimates } from '../../../hooks/TransferPanel/useOftV2FeeEstimates';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { getNetworkName } from '../../../util/networks';
import { useRouteStore } from '../hooks/useRouteStore';
import { Route } from './Route';

const LAYERZERO_VIA = 'LayerZero';
const LAYERZERO_ICON_URI = '/icons/layerzero.svg';

// Only displayed during USDT transfers
export function OftV2Route() {
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

  const oftV2Data = useRouteStore(
    (state) => state.routes.find((route) => route.type === 'oftV2')?.data,
  );

  const { feeEstimates: oftFeeEstimates, error: oftFeeEstimatesError } = useOftV2FeeEstimates({
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

    const gasChainId = isDepositMode ? networks.sourceChain.id : networks.destinationChain.id;

    return [
      {
        amount: isDepositMode
          ? utils.parseUnits(estimatedParentChainGasFees.toString(), 18).toString()
          : utils.parseUnits(estimatedChildChainGasFees.toString(), 18).toString(),
        token: {
          ...ether,
          address: constants.AddressZero,
        },
        chainId: gasChainId,
        details: {
          id: 'oftV2-gas',
          label: `${getNetworkName(gasChainId)} gas fee`,
          via: LAYERZERO_VIA,
          iconURI: LAYERZERO_ICON_URI,
        },
      },
    ];
  }, [
    estimatedChildChainGasFees,
    estimatedParentChainGasFees,
    isDepositMode,
    networks.destinationChain.id,
    networks.sourceChain.id,
    status,
  ]);

  const bridgeFee = useMemo(() => {
    if (!oftFeeEstimates?.sourceChainGasFee) {
      return undefined;
    }

    return [
      {
        amount: oftFeeEstimates.sourceChainGasFee.toString(),
        token: { ...ether, address: constants.AddressZero },
        chainId: networks.sourceChain.id,
        details: {
          id: 'oftV2-bridge-fee',
          label: 'LayerZero bridge fee',
          via: LAYERZERO_VIA,
          iconURI: LAYERZERO_ICON_URI,
        },
      },
    ];
  }, [networks.sourceChain.id, oftFeeEstimates]);

  if (oftFeeEstimatesError || !oftV2Data) {
    return null;
  }

  return (
    <Route
      type="oftV2"
      bridge={LAYERZERO_VIA}
      bridgeIconURI={LAYERZERO_ICON_URI}
      durationMs={5 * 60 * 1_000} // 5 minutes in miliseconds
      amountReceived={oftV2Data.amountReceived}
      isLoadingGasEstimate={status === 'loading'}
      gasCost={gasCost}
      bridgeFee={bridgeFee}
      selected={selectedRoute === 'oftV2'}
      onSelectedRouteClick={setSelectedRoute}
    />
  );
}

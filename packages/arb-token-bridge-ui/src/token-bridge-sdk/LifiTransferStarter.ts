import { constants } from 'ethers';

import type { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi';

import type { GasEstimates } from '../hooks/arbTokenBridge.types';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import type { TransferProps, TransferType } from './BridgeTransferStarter';
import {
  LifiRouteExecutionProps,
  LifiTransferOverrides,
  executeLifiRoute,
} from './LifiRouteExecutor';

type LifiTransferStarterProps = {
  lifiRoute: LifiCrosschainTransfersRoute;
};

/**
 * Runs a LiFi route from any ecosystem. It needs no provider: chain ids come from the route,
 * and LiFi signs through the wallet signers passed to `transfer`.
 */
export class LifiTransferStarter {
  public transferType: TransferType = 'lifi';
  private readonly lifiRoute: LifiCrosschainTransfersRoute;

  constructor({ lifiRoute }: LifiTransferStarterProps) {
    this.lifiRoute = lifiRoute;
  }

  public async transferEstimateGas(): Promise<GasEstimates> {
    const { parentChainId, childChainId } = getNetworksRelationship({
      sourceChainId: this.lifiRoute.fromChainId,
      destinationChainId: this.lifiRoute.toChainId,
    });
    return this.lifiRoute.gas.reduce<GasEstimates>(
      (result, gas) => {
        if (gas.chainId === parentChainId) {
          result.estimatedParentChainGas = result.estimatedParentChainGas.add(gas.estimate ?? 0);
        }
        if (gas.chainId === childChainId) {
          result.estimatedChildChainGas = result.estimatedChildChainGas.add(gas.estimate ?? 0);
        }
        return result;
      },
      {
        estimatedParentChainGas: constants.Zero,
        estimatedChildChainGas: constants.Zero,
      },
    );
  }

  public async transfer(
    props: Omit<TransferProps, 'signer'> & LifiRouteExecutionProps,
    { executeRoute = executeLifiRoute }: LifiTransferOverrides = {},
  ) {
    const { txHash, route } = await executeRoute(this.lifiRoute.protocolData.route, props);

    return {
      transferType: this.transferType,
      status: 'pending' as const,
      sourceChainTransaction: { hash: txHash },
      lifiRoute: route,
    };
  }
}

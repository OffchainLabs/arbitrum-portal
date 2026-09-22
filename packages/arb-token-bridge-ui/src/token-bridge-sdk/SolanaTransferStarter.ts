import { constants } from 'ethers';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import type { QuotedGasEstimates, TransferProps } from './BridgeTransferStarter';
import {
  LifiRouteExecutionProps,
  LifiTransferOverrides,
  executeLifiRoute,
} from './LifiRouteExecutor';

export type SolanaTransferStarterProps = {
  lifiRoute: LifiCrosschainTransfersRoute;
};

export class SolanaTransferStarter {
  private readonly lifiRoute: LifiCrosschainTransfersRoute;

  constructor({ lifiRoute }: SolanaTransferStarterProps) {
    this.lifiRoute = lifiRoute;
  }

  public async transferEstimateGas(): Promise<QuotedGasEstimates> {
    const { parentChainId, childChainId } = getNetworksRelationship({
      sourceChainId: this.lifiRoute.fromChainId,
      destinationChainId: this.lifiRoute.toChainId,
    });
    return this.lifiRoute.gas.reduce<QuotedGasEstimates>(
      (result, gas) => {
        if (gas.chainId === parentChainId) {
          result.estimatedParentChainGas = result.estimatedParentChainGas.add(gas.estimate ?? 0);
          result.estimatedParentChainGasFee = result.estimatedParentChainGasFee.add(gas.amount);
        }
        if (gas.chainId === childChainId) {
          result.estimatedChildChainGas = result.estimatedChildChainGas.add(gas.estimate ?? 0);
          result.estimatedChildChainGasFee = result.estimatedChildChainGasFee.add(gas.amount);
        }
        return result;
      },
      {
        estimatedParentChainGas: constants.Zero,
        estimatedChildChainGas: constants.Zero,
        estimatedParentChainGasFee: constants.Zero,
        estimatedChildChainGasFee: constants.Zero,
      },
    );
  }

  public async transfer(
    props: Omit<TransferProps, 'signer'> & LifiRouteExecutionProps,
    { executeRoute = executeLifiRoute }: LifiTransferOverrides = {},
  ) {
    const { txHash, route } = await executeRoute(this.lifiRoute.protocolData.route, props);

    return {
      transferType: 'lifi' as const,
      status: 'pending' as const,
      // LiFi returns the signature once the transaction is confirmed
      sourceChainTransaction: { hash: txHash, wait: () => Promise.resolve() },
      lifiRoute: route,
    };
  }
}

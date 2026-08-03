import { BigNumber, constants } from 'ethers';

import type { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi';

import { isDepositMode } from '../util/isDepositMode';
import {
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  TransferProps,
  TransferType,
} from './BridgeTransferStarter';
import { LifiRouteExecutionProps, executeLifiRoute } from './LifiRouteExecutor';

type LifiTransferStarterProps = BridgeTransferStarterProps & {
  lifiRoute: LifiCrosschainTransfersRoute;
};

export class LifiTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'lifi';
  private lifiRoute: LifiCrosschainTransfersRoute;

  constructor(props: LifiTransferStarterProps) {
    super(props);
    this.lifiRoute = props.lifiRoute;
  }

  public requiresNativeCurrencyApproval = async () => {
    return false;
  };

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public approveNativeCurrency = async () => {
    // no-op
  };

  public async requiresTokenApproval(): Promise<boolean> {
    return false;
  }

  public async approveToken() {
    // LiFi SDK handles approval during route execution.
  }

  public async approveTokenEstimateGas() {
    return constants.Zero;
  }

  public async transferEstimateGas() {
    const sourceChainId = await this.getSourceChainId();
    const destinationChainId = (await this.destinationChainProvider.getNetwork()).chainId;
    const isDeposit = isDepositMode({ sourceChainId, destinationChainId });
    const parentChainId = isDeposit ? sourceChainId : destinationChainId;
    const childChainId = isDeposit ? destinationChainId : sourceChainId;

    const getGasEstimateForChain = (chainId: number) =>
      this.lifiRoute.gas.reduce((sum, gas) => {
        if (gas.chainId !== chainId || !gas.estimate) {
          return sum;
        }

        return sum.add(BigNumber.from(gas.estimate));
      }, constants.Zero);

    return {
      estimatedParentChainGas: getGasEstimateForChain(parentChainId),
      estimatedChildChainGas: getGasEstimateForChain(childChainId),
    };
  }

  public async transfer({
    wagmiConfig,
    switchChainAsync,
    onApprovalRequest,
    onRouteUpdate,
    onRouteExecutionError,
  }: TransferProps & LifiRouteExecutionProps) {
    const { txHash, route } = await executeLifiRoute(this.lifiRoute.protocolData.route, {
      wagmiConfig,
      switchChainAsync,
      onApprovalRequest,
      onRouteUpdate,
      onRouteExecutionError,
    });
    const fullTx = await this.sourceChainProvider.getTransaction(txHash).catch(() => null);

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: fullTx ?? { hash: txHash },
      destinationChainProvider: this.destinationChainProvider,
      lifiRoute: route,
    };
  }
}

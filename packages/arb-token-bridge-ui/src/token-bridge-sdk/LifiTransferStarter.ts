import type { Route } from '@lifi/sdk';
import { BigNumber, constants } from 'ethers';
import type { Address } from 'viem';

import type { Token } from '@/bridge/app/api/crosschain-transfers/types';

import { isDepositMode } from '../util/isDepositMode';
import {
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  TransferProps,
  TransferType,
} from './BridgeTransferStarter';
import { LifiRouteExecutionProps, executeLifiRoute } from './LifiRouteExecutor';

export type AmountWithToken = {
  amount: BigNumber;
  amountUSD: string;
  token: Token;
};

export type LifiData = {
  spenderAddress: Address;
  gas: AmountWithToken;
  fee: AmountWithToken;
  route: Route;
};

type LifiTransferStarterProps = BridgeTransferStarterProps & {
  lifiData: LifiData;
};

export class LifiTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'lifi';
  private lifiData: LifiData;

  constructor(props: LifiTransferStarterProps) {
    super(props);
    this.lifiData = props.lifiData;
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

    return {
      estimatedParentChainGas: isDeposit ? this.lifiData.gas.amount : constants.Zero,
      estimatedChildChainGas: isDeposit ? constants.Zero : this.lifiData.gas.amount,
    };
  }

  public async transfer({
    wagmiConfig,
    switchChainAsync,
    onApprovalRequest,
    onRouteExecutionError,
  }: TransferProps & LifiRouteExecutionProps) {
    const { txHash } = await executeLifiRoute(this.lifiData.route, {
      wagmiConfig,
      switchChainAsync,
      onApprovalRequest,
      onRouteExecutionError,
    });
    const fullTx = await this.sourceChainProvider.getTransaction(txHash).catch(() => null);

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: fullTx ?? { hash: txHash },
      destinationChainProvider: this.destinationChainProvider,
    };
  }

  public async transferEstimateFee() {
    return this.lifiData.fee.amount;
  }
}

import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory';
import { Config, sendTransaction } from '@wagmi/core';
import { BigNumber, constants } from 'ethers';
import { Address } from 'viem';

import { TransactionRequest } from '@/bridge/app/api/crosschain-transfers/lifi';
import { Token } from '@/bridge/app/api/crosschain-transfers/types';

import { fetchErc20Allowance } from '../util/TokenUtils';
import { isDepositMode } from '../util/isDepositMode';
import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferProps,
  TransferType,
} from './BridgeTransferStarter';

export type AmountWithToken = {
  amount: BigNumber;
  amountUSD: string;
  token: Token;
};
export type LifiData = {
  spenderAddress: Address;
  gas: AmountWithToken;
  fee: AmountWithToken;
  transactionRequest?: TransactionRequest;
};
export type LifiTransferStarterProps = BridgeTransferStarterProps & {
  lifiData: LifiData;
};

export class LifiTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'lifi';
  private lifiData: LifiData;

  constructor(props: LifiTransferStarterProps) {
    super(props);
    this.lifiData = {
      spenderAddress: props.lifiData.spenderAddress as Address,
      gas: props.lifiData.gas,
      fee: props.lifiData.fee,
      transactionRequest: props.lifiData.transactionRequest,
    };
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

  public async requiresTokenApproval({
    amount,
    owner,
  }: RequiresTokenApprovalProps): Promise<boolean> {
    if (!this.sourceChainErc20Address || this.sourceChainErc20Address === constants.AddressZero) {
      // If we have no sourceChainErc20Address, we assume we want to send ETH
      return false;
    }

    const allowance = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner,
      spender: this.lifiData.spenderAddress,
    });

    return allowance.lt(amount);
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address || this.sourceChainErc20Address === constants.AddressZero) {
      return;
    }

    const contract = ERC20__factory.connect(this.sourceChainErc20Address, signer);

    return contract.approve(this.lifiData.spenderAddress, amount ?? constants.MaxUint256, {
      from: await signer.getAddress(),
    });
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      return constants.Zero;
    }

    const contract = ERC20__factory.connect(this.sourceChainErc20Address, signer);

    return contract.estimateGas.approve(
      this.lifiData.spenderAddress,
      amount ?? constants.MaxUint256,
      {
        from: await signer.getAddress(),
      },
    );
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

  public async transfer({ wagmiConfig }: TransferProps & { wagmiConfig: Config }) {
    if (!this.lifiData.transactionRequest) {
      throw new Error('LifiTransferStarter is missing transaction request.');
    }

    const { to, data, value } = this.lifiData.transactionRequest;
    const txHash = await sendTransaction(wagmiConfig, {
      to: to as Address,
      data: data as Address,
      value: BigInt(value),
    });
    const fullTx = await this.sourceChainProvider.getTransaction(txHash);

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

import { BigNumber, constants } from 'ethers';

import { isDepositMode as isDepositModeUtil } from '../util/isDepositMode';
import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferEstimateGasProps,
  TransferProps,
  TransferType,
} from './BridgeTransferStarter';
import {
  LzQuote,
  LzQuoteUserStep,
  fetchLzQuote,
  getLzValueTransferConfig,
} from './lzValueTransferUtils';
import { getChainIdFromProvider } from './utils';

export class LzValueTransferStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'lzValueTransfer';

  private cachedQuote?: LzQuote;
  private transferConfig?: {
    srcChainKey: string;
    dstChainKey: string;
    srcTokenAddress: string;
    dstTokenAddress: string;
  };

  constructor(props: BridgeTransferStarterProps) {
    super(props);
    if (!this.sourceChainErc20Address) {
      throw Error('LZ Value Transfer token address not found');
    }
  }

  private async validateConfig() {
    if (this.transferConfig) {
      return;
    }

    const [sourceChainId, destinationChainId] = await Promise.all([
      this.sourceChainProvider.getNetwork().then((n) => n.chainId),
      this.destinationChainProvider.getNetwork().then((n) => n.chainId),
    ]);

    const config = getLzValueTransferConfig({
      sourceChainId,
      destinationChainId,
      sourceChainErc20Address: this.sourceChainErc20Address,
    });

    if (!config.isValid) {
      throw Error('LZ Value Transfer validation failed');
    }

    this.transferConfig = {
      srcChainKey: config.srcChainKey,
      dstChainKey: config.dstChainKey,
      srcTokenAddress: config.srcTokenAddress,
      dstTokenAddress: config.dstTokenAddress,
    };
  }

  private async getQuote({
    amount,
    walletAddress,
    destinationAddress,
  }: {
    amount: BigNumber;
    walletAddress: string;
    destinationAddress?: string;
  }): Promise<LzQuote> {
    await this.validateConfig();

    if (!this.transferConfig) {
      throw new Error('LZ Value Transfer config not initialized');
    }

    const quote = await fetchLzQuote({
      srcChainKey: this.transferConfig.srcChainKey,
      dstChainKey: this.transferConfig.dstChainKey,
      srcTokenAddress: this.transferConfig.srcTokenAddress,
      dstTokenAddress: this.transferConfig.dstTokenAddress,
      srcWalletAddress: walletAddress,
      dstWalletAddress: destinationAddress,
      amount: amount.toString(),
    });

    this.cachedQuote = quote;
    return quote;
  }

  private getApproveStep(quote: LzQuote): LzQuoteUserStep | undefined {
    return quote.userSteps.find((step) => step.description === 'approve');
  }

  private getBridgeStep(quote: LzQuote): LzQuoteUserStep | undefined {
    return quote.userSteps.find((step) => step.description === 'bridge');
  }

  public async requiresNativeCurrencyApproval() {
    return false;
  }

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public async approveNativeCurrency() {
    // no-op
  }

  public async requiresTokenApproval({ amount, owner }: RequiresTokenApprovalProps) {
    await this.validateConfig();

    // Fetch a quote to check if an approve step is needed
    const quote = await this.getQuote({ amount, walletAddress: owner });
    return !!this.getApproveStep(quote);
  }

  public async approveTokenEstimateGas() {
    // Use a reasonable default gas estimate for ERC20 approval
    return BigNumber.from(60_000);
  }

  public async approveToken({ signer }: ApproveTokenProps) {
    if (!this.cachedQuote) {
      throw new Error('No cached quote. Call requiresTokenApproval first.');
    }

    const approveStep = this.getApproveStep(this.cachedQuote);
    if (!approveStep) {
      throw new Error('No approve step in cached quote');
    }

    const { encoded } = approveStep.transaction;
    return signer.sendTransaction({
      to: encoded.to,
      data: encoded.data,
      value: encoded.value ? BigNumber.from(encoded.value) : undefined,
      chainId: encoded.chainId,
    });
  }

  public async transferEstimateGas() {
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider);
    const destinationChainId = await getChainIdFromProvider(this.destinationChainProvider);

    const isDeposit = isDepositModeUtil({ sourceChainId, destinationChainId });

    // Default gas estimates based on typical Value Transfer API transactions
    const gasEstimate = BigNumber.from(Math.round(200_000 * 1.3));

    return {
      estimatedParentChainGas: isDeposit ? gasEstimate : constants.Zero,
      estimatedChildChainGas: isDeposit ? constants.Zero : gasEstimate,
    };
  }

  public async transferEstimateFee({ amount, from, destinationAddress }: TransferEstimateGasProps) {
    try {
      const quote = await this.getQuote({
        amount,
        walletAddress: from,
        destinationAddress,
      });

      // The bridge step's value field represents the native fee
      const bridgeStep = this.getBridgeStep(quote);
      const nativeFee = bridgeStep?.transaction.encoded.value
        ? BigNumber.from(bridgeStep.transaction.encoded.value)
        : constants.Zero;

      return {
        estimatedSourceChainFee: nativeFee,
        estimatedDestinationChainFee: constants.Zero,
      };
    } catch {
      return {
        estimatedSourceChainFee: constants.Zero,
        estimatedDestinationChainFee: constants.Zero,
      };
    }
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    await this.validateConfig();
    const walletAddress = await signer.getAddress();

    // Always fetch a fresh quote for the actual transfer
    const quote = await this.getQuote({
      amount,
      walletAddress,
      destinationAddress,
    });

    const bridgeStep = this.getBridgeStep(quote);
    if (!bridgeStep) {
      throw new Error('No bridge step in quote');
    }

    const { encoded } = bridgeStep.transaction;
    const tx = await signer.sendTransaction({
      to: encoded.to,
      data: encoded.data,
      value: encoded.value ? BigNumber.from(encoded.value) : undefined,
      chainId: encoded.chainId,
    });

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { hash: tx.hash },
      destinationChainProvider: this.destinationChainProvider,
    };
  }
}

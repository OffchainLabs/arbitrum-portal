import { BigNumber, constants, utils } from 'ethers';

import { truncateExtraDecimals } from '@/bridge/util/NumberUtils';
import type { TransactionStep } from '@/earn-api/types';

const DEFAULT_NATIVE_GAS_BUFFER_ETH = '0.0005';
const NATIVE_GAS_BUFFER_MULTIPLIER = 1.4;

export function checkAmountExceedsBalance(
  amountRaw: string,
  balance: BigNumber,
  isConnected: boolean,
  walletAddress: string | undefined,
): boolean {
  if (!isConnected || !walletAddress || amountRaw === '0') {
    return false;
  }

  if (!/^\d+$/.test(amountRaw)) {
    return false;
  }

  try {
    return BigNumber.from(amountRaw).gt(balance);
  } catch {
    return false;
  }
}

export function parseAmountToRawUnits(
  amount: string,
  selectedAction: 'supply' | 'withdraw',
  assetDecimals: number,
  lpTokenDecimals: number,
): string {
  if (!amount || parseFloat(amount) <= 0) return '0';
  const decimals = selectedAction === 'supply' ? assetDecimals : lpTokenDecimals;
  return utils.parseUnits(truncateExtraDecimals(amount, decimals), decimals).toString();
}

export function getChainIdFromQuote(transactionSteps: TransactionStep[] | undefined): number {
  if (!transactionSteps || transactionSteps.length === 0 || !transactionSteps[0]) return 0;
  return transactionSteps[0].chainId;
}

export function validateTransactionStep(step: TransactionStep, index: number): void {
  const stepNumber = index + 1;

  if (!step.to || typeof step.to !== 'string' || step.to.length === 0) {
    throw new Error(`Invalid transaction step ${stepNumber}: missing or invalid 'to' address`);
  }

  if (!step.data || typeof step.data !== 'string' || step.data.length === 0) {
    throw new Error(`Invalid transaction step ${stepNumber}: missing or invalid 'data' field`);
  }

  if (!step.chainId || typeof step.chainId !== 'number') {
    throw new Error(`Invalid transaction step ${stepNumber}: missing or invalid 'chainId'`);
  }
}

export function getMaxAmountWithGasBuffer({
  balanceRaw,
  decimals,
  isNativeAsset,
  estimatedGasEth,
}: {
  balanceRaw: BigNumber;
  decimals: number;
  isNativeAsset: boolean;
  estimatedGasEth?: string | null;
}): string {
  if (!isNativeAsset) {
    return utils.formatUnits(balanceRaw, decimals);
  }

  let gasBufferWei = constants.Zero;
  if (estimatedGasEth) {
    const estimatedGas = Number(estimatedGasEth);
    if (Number.isFinite(estimatedGas) && estimatedGas > 0) {
      gasBufferWei = utils.parseEther((estimatedGas * NATIVE_GAS_BUFFER_MULTIPLIER).toString());
    }
  }

  if (gasBufferWei.isZero()) {
    gasBufferWei = utils.parseEther(DEFAULT_NATIVE_GAS_BUFFER_ETH);
  }

  if (balanceRaw.lte(gasBufferWei)) {
    return '0';
  }

  return utils.formatUnits(balanceRaw.sub(gasBufferWei), decimals);
}

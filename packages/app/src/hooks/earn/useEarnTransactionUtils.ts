import { BigNumber, utils } from 'ethers';

import type { TransactionStep } from './useTransactionQuote';

export function checkAmountExceedsBalance(
  amount: string,
  balance: BigNumber,
  decimals: number,
  isConnected: boolean,
  walletAddress: string | undefined,
): boolean {
  if (!isConnected || !walletAddress || !amount || parseFloat(amount) <= 0) {
    return false;
  }
  const amountNum = parseFloat(amount);
  const balanceFloat = parseFloat(utils.formatUnits(balance, decimals));
  return amountNum > balanceFloat;
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

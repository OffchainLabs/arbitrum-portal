import { BigNumber, utils } from 'ethers';

import type { TransactionStep } from './useTransactionQuote';

/**
 * Check if the entered amount exceeds the user's balance
 * @param amount - The amount string entered by the user
 * @param balance - The user's balance in raw units (BigNumber)
 * @param decimals - The token decimals
 * @param isConnected - Whether wallet is connected
 * @param walletAddress - The wallet address
 * @returns true if amount exceeds balance, false otherwise
 */
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

/**
 * Validate a transaction step and throw descriptive errors if invalid
 * @param step - The transaction step to validate
 * @param index - The index of the step (0-based, used for error messages)
 * @throws Error if step is invalid
 */
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

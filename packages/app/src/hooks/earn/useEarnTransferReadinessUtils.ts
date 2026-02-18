export enum EarnTransferReadinessRichErrorMessage {
  GAS_ESTIMATION_FAILURE = 'Gas estimation failed. Please try again.',
  INSUFFICIENT_BALANCE = 'Insufficient balance.',
  INSUFFICIENT_GAS_BALANCE = 'Insufficient balance for gas fees.',
}

type GetInsufficientFundsErrorMessageParams = {
  asset: string;
  chain: string;
};

type GetInsufficientFundsForGasFeesErrorMessageParams = GetInsufficientFundsErrorMessageParams & {
  balance: string;
  requiredBalance: string;
};

export function getInsufficientFundsErrorMessage({
  asset,
  chain,
}: GetInsufficientFundsErrorMessageParams) {
  return `Insufficient ${asset}. Please add more funds to ${chain}.`;
}

export function getInsufficientFundsForGasFeesErrorMessage({
  asset,
  chain,
  balance,
  requiredBalance,
}: GetInsufficientFundsForGasFeesErrorMessageParams) {
  const errorMessage = `Please add more ${asset} on ${chain} to pay for fees.`;

  if (balance === requiredBalance) {
    // An edge case where formatAmount returns the same value. In this case we don't want to show balances because in the UI it's the same as requiredBalance.
    return errorMessage;
  }

  return (
    errorMessage +
    ` You currently have ${balance} ${asset}, but the transaction requires ${requiredBalance} ${asset}.`
  );
}

import { TransactionRequest } from '@lifi/sdk';

export function isValidTransactionRequest(
  transactionRequest: unknown,
): transactionRequest is Required<
  Pick<TransactionRequest, 'value' | 'to' | 'data' | 'from' | 'chainId' | 'gasPrice' | 'gasLimit'>
> {
  if (typeof transactionRequest !== 'object' || transactionRequest === null) {
    return false;
  }

  const { value, to, data, from, chainId, gasPrice, gasLimit } = transactionRequest as Partial<
    Record<keyof TransactionRequest, unknown>
  >;

  if (!value || !to || !data || !from || !chainId || !gasPrice || !gasLimit) {
    return false;
  }

  return true;
}

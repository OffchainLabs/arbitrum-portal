import type { SolanaSendTransactionInput } from '../wallet/types';

export class SolanaTransferStarter {
  public static prepareTransaction(transactionRequest: unknown): SolanaSendTransactionInput {
    if (
      typeof transactionRequest !== 'object' ||
      transactionRequest === null ||
      !('data' in transactionRequest) ||
      typeof transactionRequest.data !== 'string'
    ) {
      throw new Error('Solana transaction payload is missing.');
    }

    return {
      serializedTransaction: transactionRequest.data,
    };
  }
}

/* eslint-disable no-await-in-loop -- Confirmation RPC reads depend on the previous result and must run sequentially. */
import { VersionedTransaction } from '@solana/web3.js';
import type { Connection } from '@solana/web3.js';

export async function confirmSolanaTransaction({
  connection,
  signature,
  serializedTransaction,
}: {
  connection: Pick<Connection, 'getSignatureStatuses' | 'isBlockhashValid'>;
  signature: string;
  serializedTransaction: Uint8Array;
}): Promise<void> {
  const { recentBlockhash } = VersionedTransaction.deserialize(serializedTransaction).message;

  while (true) {
    let status:
      | Awaited<ReturnType<Connection['getSignatureStatuses']>>['value'][number]
      | undefined;
    let expired = false;
    try {
      const response = await connection.getSignatureStatuses([signature], {
        searchTransactionHistory: true,
      });
      status = response.value[0];
      if (!status) {
        const validity = await connection.isBlockhashValid(recentBlockhash, {
          commitment: 'confirmed',
        });
        if (!validity.value) {
          const finalStatus = await connection.getSignatureStatuses([signature], {
            searchTransactionHistory: true,
          });
          status = finalStatus.value[0];
          expired = !status;
        }
      }
    } catch {
      // An RPC outage leaves a submitted transaction pending.
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      continue;
    }

    if (status?.err) {
      throw new Error(`Solana transaction confirmation failed: ${JSON.stringify(status.err)}`);
    }
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return;
    }
    if (expired) {
      throw new Error('Solana transaction expired before confirmation.');
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

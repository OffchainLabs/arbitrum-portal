import type { SignatureStatus } from '@solana/web3.js';
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { confirmSolanaTransaction } from './confirmSolanaTransaction';

const blockhash = '11111111111111111111111111111111';
const serializedTransaction = new VersionedTransaction(
  new TransactionMessage({
    payerKey: new PublicKey('So11111111111111111111111111111111111111112'),
    recentBlockhash: blockhash,
    instructions: [],
  }).compileToV0Message(),
).serialize();

function response(status: SignatureStatus | null) {
  return { context: { slot: 1 }, value: [status] };
}

const confirmed: SignatureStatus = {
  slot: 1,
  confirmations: 1,
  err: null,
  confirmationStatus: 'confirmed',
};

function rpc() {
  return {
    getSignatureStatuses: vi.fn(async () => response(confirmed)),
    isBlockhashValid: vi.fn(async () => ({ context: { slot: 1 }, value: true })),
  };
}

function confirm(connection: ReturnType<typeof rpc>) {
  return confirmSolanaTransaction({ connection, signature: 'signature', serializedTransaction });
}

afterEach(() => vi.useRealTimers());

describe.sequential('Solana source confirmation', () => {
  it('confirms the submitted signature from transaction history', async () => {
    const connection = rpc();
    await expect(confirm(connection)).resolves.toBeUndefined();
    expect(connection.getSignatureStatuses).toHaveBeenCalledExactlyOnceWith(['signature'], {
      searchTransactionHistory: true,
    });
    expect(connection.isBlockhashValid).not.toHaveBeenCalled();
  });

  it('keeps a valid submitted transaction pending beyond the legacy 30 second timeout', async () => {
    vi.useFakeTimers();
    const connection = rpc();
    connection.getSignatureStatuses.mockImplementation(async () =>
      response(connection.getSignatureStatuses.mock.calls.length <= 31 ? null : confirmed),
    );
    const confirmation = confirm(connection);
    let done = false;
    void confirmation.then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(confirmation).resolves.toBeUndefined();
    expect(connection.isBlockhashValid).toHaveBeenCalledWith(blockhash, {
      commitment: 'confirmed',
    });
  });

  it('retries transport failures without marking the transaction failed', async () => {
    vi.useFakeTimers();
    const connection = rpc();
    connection.getSignatureStatuses.mockRejectedValueOnce(new Error('RPC unavailable'));
    const confirmation = confirm(connection);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(confirmation).resolves.toBeUndefined();
  });

  it('continues confirming a landed transaction after its blockhash expires', async () => {
    vi.useFakeTimers();
    const connection = rpc();
    connection.getSignatureStatuses.mockResolvedValueOnce(
      response({ ...confirmed, confirmationStatus: 'processed' }),
    );
    connection.isBlockhashValid.mockResolvedValue({ context: { slot: 1 }, value: false });
    const confirmation = confirm(connection);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(confirmation).resolves.toBeUndefined();
    expect(connection.isBlockhashValid).not.toHaveBeenCalled();
  });

  it('fails only after the original blockhash expires and a history recheck is still absent', async () => {
    const connection = rpc();
    connection.getSignatureStatuses.mockResolvedValue(response(null));
    connection.isBlockhashValid.mockResolvedValue({ context: { slot: 1 }, value: false });
    await expect(confirm(connection)).rejects.toThrow(/expired/);
    expect(connection.getSignatureStatuses).toHaveBeenCalledTimes(2);
  });

  it('accepts a confirmation that arrives during the expiry check', async () => {
    const connection = rpc();
    connection.getSignatureStatuses.mockResolvedValueOnce(response(null));
    connection.isBlockhashValid.mockResolvedValue({ context: { slot: 1 }, value: false });
    await expect(confirm(connection)).resolves.toBeUndefined();
  });

  it('reports a chain execution error', async () => {
    const connection = rpc();
    connection.getSignatureStatuses.mockResolvedValue(
      response({ ...confirmed, err: { InstructionError: [0, 'InvalidArgument'] } }),
    );
    await expect(confirm(connection)).rejects.toThrow(/confirmation failed/);
  });
});

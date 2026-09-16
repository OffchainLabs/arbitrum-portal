import bs58 from 'bs58';
import { describe, expect, it } from 'vitest';

import { isValidTransactionId, normalizeTransactionId } from './TransactionIdUtils';

describe('transaction IDs', () => {
  it('validates a 64-byte signature and preserves its case', () => {
    const signature = bs58.encode(Uint8Array.from({ length: 64 }, (_, index) => index + 1));
    expect(isValidTransactionId(signature)).toBe(true);
    expect(normalizeTransactionId(signature)).toBe(signature);
    expect(isValidTransactionId(bs58.encode(new Uint8Array(32)))).toBe(false);
    expect(isValidTransactionId('wallet-request-id')).toBe(false);
  });
  it('retains EVM hash case normalization', () => {
    const hash = `0x${'AB'.repeat(32)}`;
    expect(isValidTransactionId(hash)).toBe(true);
    expect(normalizeTransactionId(hash)).toBe(hash.toLowerCase());
  });
});

import { describe, expect, it } from 'vitest';

import { formatTransactionError, isUserRejectedError } from '../isUserRejectedError';

describe('isUserRejectedError', () => {
  it('returns true for known rejection codes', () => {
    expect(isUserRejectedError({ code: 4001 })).toBe(true);
    expect(isUserRejectedError({ code: 'ACTION_REJECTED' })).toBe(true);
  });

  it('returns true for known rejection messages', () => {
    expect(isUserRejectedError({ message: 'User Cancelled Request' })).toBe(true);
    expect(
      isUserRejectedError({
        details: 'MetaMask Tx Signature: User denied transaction signature.',
      }),
    ).toBe(true);
  });

  it('returns false for non-rejection errors', () => {
    expect(isUserRejectedError({ code: 'SOME_OTHER_ERROR' })).toBe(false);
    expect(isUserRejectedError(new Error('Something failed'))).toBe(false);
  });
});

describe('formatTransactionError', () => {
  it('formats known rejection errors as "Transaction rejected"', () => {
    expect(formatTransactionError({ code: 4001 })).toBe('Transaction rejected');
    expect(formatTransactionError({ code: 'ACTION_REJECTED' })).toBe('Transaction rejected');
  });

  it('returns error.message for generic Error instances', () => {
    expect(formatTransactionError(new Error('Network failed'))).toBe('Network failed');
  });

  it('returns the provided default message when error shape is unknown', () => {
    expect(formatTransactionError({ foo: 'bar' }, 'Fallback message')).toBe('Fallback message');
  });
});

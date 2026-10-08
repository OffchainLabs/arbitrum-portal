import { describe, expect, it } from 'vitest';

import { getFailedChainPairs, recordChainPairFetch } from '../useTransactionHistory';

const ONE = { parentChainId: 1, childChainId: 42161 };
const NOVA = { parentChainId: 1, childChainId: 42170 };

describe('recordChainPairFetch', () => {
  it('records a failure once', () => {
    const once = recordChainPairFetch({ type: 'deposits', chainPair: ONE, failed: true });
    const twice = recordChainPairFetch({
      failures: once,
      type: 'deposits',
      chainPair: ONE,
      failed: true,
    });

    expect(twice).toBe(once);
    expect(getFailedChainPairs(twice)).toEqual([ONE]);
  });

  it('clears a failure when the same fetch later succeeds', () => {
    const failures = recordChainPairFetch({ type: 'deposits', chainPair: ONE, failed: true });

    expect(
      getFailedChainPairs(
        recordChainPairFetch({ failures, type: 'deposits', chainPair: ONE, failed: false }),
      ),
    ).toEqual([]);
  });

  it("keeps a deposit failure when the same pair's withdrawals succeed", () => {
    const failures = recordChainPairFetch({ type: 'deposits', chainPair: ONE, failed: true });

    expect(
      getFailedChainPairs(
        recordChainPairFetch({ failures, type: 'withdrawals', chainPair: ONE, failed: false }),
      ),
    ).toEqual([ONE]);
  });

  it('returns the same list when a success has nothing to clear', () => {
    const failures = recordChainPairFetch({ type: 'deposits', chainPair: NOVA, failed: true });

    expect(
      recordChainPairFetch({ failures, type: 'deposits', chainPair: ONE, failed: false }),
    ).toBe(failures);
  });
});

describe('getFailedChainPairs', () => {
  it('lists a pair once when both of its fetches failed', () => {
    const depositFailed = recordChainPairFetch({ type: 'deposits', chainPair: ONE, failed: true });
    const bothFailed = recordChainPairFetch({
      failures: depositFailed,
      type: 'withdrawals',
      chainPair: ONE,
      failed: true,
    });

    expect(getFailedChainPairs(bothFailed)).toEqual([ONE]);
  });
});

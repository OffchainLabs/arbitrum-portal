import { describe, expect, it } from 'vitest';

import {
  getFailedChainPairs,
  getFailedChainPairsForFilter,
  recordChainPairFetch,
} from '../useTransactionHistory';

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

  it('only exposes failures that match the active chain filter', () => {
    const oneFailed = recordChainPairFetch({ type: 'deposits', chainPair: ONE, failed: true });
    const novaFailed = recordChainPairFetch({
      failures: oneFailed,
      type: 'deposits',
      chainPair: NOVA,
      failed: true,
    });

    expect(
      getFailedChainPairsForFilter(novaFailed, {
        type: 'core-chains',
        chainIds: [42170],
        coreChainIds: [1, 42161, 42170],
      }),
    ).toEqual([NOVA]);
  });
});

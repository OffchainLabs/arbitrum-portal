import { describe, expect, it } from 'vitest';

import { getFailedChainPairs } from './chainPairFetches';

const ONE = { parentChainId: 1, childChainId: 42161 };
const NOVA = { parentChainId: 1, childChainId: 42170 };

describe('getFailedChainPairs', () => {
  it('lists only the pairs whose fetch failed', () => {
    expect(
      getFailedChainPairs([
        { chainPair: ONE, transfers: [], failed: true },
        { chainPair: NOVA, transfers: [], failed: false },
      ]),
    ).toEqual([ONE]);
  });

  it('lists a pair once when its deposits and withdrawals both failed', () => {
    expect(
      getFailedChainPairs([
        { chainPair: ONE, transfers: [], failed: true },
        { chainPair: { ...ONE }, transfers: [], failed: true },
      ]),
    ).toEqual([ONE]);
  });

  it("keeps a deposit failure when the same pair's withdrawals succeed", () => {
    expect(
      getFailedChainPairs([
        { chainPair: ONE, transfers: [], failed: true },
        { chainPair: ONE, transfers: [{}], failed: false },
      ]),
    ).toEqual([ONE]);
  });
});

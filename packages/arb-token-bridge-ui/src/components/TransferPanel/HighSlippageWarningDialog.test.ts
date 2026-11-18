import { describe, expect, it } from 'vitest';

import { getAmountLoss, hasHighUsdSlippage } from './TransferWarningUtils';

describe('getAmountLoss', () => {
  it('calculates the absolute and percentage loss', () => {
    expect(getAmountLoss({ fromAmount: 6, toAmount: 0.3 })).toEqual({
      diff: 5.7,
      lossPercentage: 95,
    });
  });
});

describe('hasHighUsdSlippage', () => {
  it('returns true when USD value loss exceeds the threshold', () => {
    expect(
      hasHighUsdSlippage({
        fromAmountUsd: 100,
        toAmountUsd: 85,
      }),
    ).toBe(true);
  });

  it('returns false when USD value loss is below the threshold', () => {
    expect(
      hasHighUsdSlippage({
        fromAmountUsd: 100,
        toAmountUsd: 95,
      }),
    ).toBe(false);
  });

  it('treats a zero destination value as a complete USD loss', () => {
    expect(
      hasHighUsdSlippage({
        fromAmountUsd: 100,
        toAmountUsd: 0,
      }),
    ).toBe(true);
  });
});

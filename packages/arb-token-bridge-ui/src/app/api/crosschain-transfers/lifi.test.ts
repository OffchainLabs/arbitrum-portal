import { constants, utils } from 'ethers';
import { describe, expect, it } from 'vitest';

import { LifiCrosschainTransfersRoute, findCheapestRoute, findFastestRoute } from './lifi';

const eth = (value: string) => utils.parseEther(value).toString();

function createMockRoute(
  overrides: Partial<{
    toAmount: string;
    durationMs: number;
  }> = {},
): LifiCrosschainTransfersRoute {
  const defaultToken = {
    symbol: 'ETH',
    decimals: 18,
    address: constants.AddressZero,
    logoURI: '',
  };

  return {
    type: 'lifi',
    durationMs: overrides.durationMs ?? 60_000,
    gas: { amount: '0', amountUSD: '0', token: defaultToken },
    fee: { amount: '0', amountUSD: '0', token: defaultToken },
    fromAmount: { amount: eth('1'), amountUSD: '1', token: defaultToken },
    toAmount: { amount: overrides.toAmount ?? eth('1'), amountUSD: '1', token: defaultToken },
    fromChainId: 1,
    toChainId: 42161,
    spenderAddress: constants.AddressZero,
    protocolData: {
      orders: [],
      tool: { key: 'test', name: 'Test', logoURI: '' },
      step: {} as LifiCrosschainTransfersRoute['protocolData']['step'],
    },
  };
}

describe('findCheapestRoute', () => {
  it('returns the route with the highest output amount', () => {
    const low = createMockRoute({ toAmount: eth('0.5') });
    const mid = createMockRoute({ toAmount: eth('1') });
    const high = createMockRoute({ toAmount: eth('1.5') });

    expect(findCheapestRoute([low, mid, high])).toBe(high);
  });

  it('returns the route with the highest output regardless of order', () => {
    const low = createMockRoute({ toAmount: eth('0.5') });
    const high = createMockRoute({ toAmount: eth('2') });
    const mid = createMockRoute({ toAmount: eth('1') });

    expect(findCheapestRoute([high, low, mid])).toBe(high);
    expect(findCheapestRoute([mid, high, low])).toBe(high);
    expect(findCheapestRoute([low, high, mid])).toBe(high);
  });

  it('returns the single route when only one exists', () => {
    const route = createMockRoute({ toAmount: eth('1') });
    expect(findCheapestRoute([route])).toBe(route);
  });

  it('returns the first route when all have equal output', () => {
    const a = createMockRoute({ toAmount: eth('1') });
    const b = createMockRoute({ toAmount: eth('1') });
    expect(findCheapestRoute([a, b])).toBe(a);
  });

  it('returns undefined for empty array', () => {
    expect(findCheapestRoute([])).toBeUndefined();
  });
});

describe('findFastestRoute', () => {
  it('returns the route with the shortest duration', () => {
    const slow = createMockRoute({ durationMs: 120_000 });
    const fast = createMockRoute({ durationMs: 30_000 });
    const mid = createMockRoute({ durationMs: 60_000 });

    expect(findFastestRoute([slow, fast, mid])).toBe(fast);
  });

  it('returns the fastest route regardless of order', () => {
    const slow = createMockRoute({ durationMs: 120_000 });
    const fast = createMockRoute({ durationMs: 10_000 });
    const mid = createMockRoute({ durationMs: 60_000 });

    expect(findFastestRoute([fast, slow, mid])).toBe(fast);
    expect(findFastestRoute([mid, fast, slow])).toBe(fast);
    expect(findFastestRoute([slow, mid, fast])).toBe(fast);
  });

  it('returns the single route when only one exists', () => {
    const route = createMockRoute({ durationMs: 60_000 });
    expect(findFastestRoute([route])).toBe(route);
  });

  it('returns the first route when all have equal duration', () => {
    const a = createMockRoute({ durationMs: 60_000 });
    const b = createMockRoute({ durationMs: 60_000 });
    expect(findFastestRoute([a, b])).toBe(a);
  });

  it('returns undefined for empty array', () => {
    expect(findFastestRoute([])).toBeUndefined();
  });
});

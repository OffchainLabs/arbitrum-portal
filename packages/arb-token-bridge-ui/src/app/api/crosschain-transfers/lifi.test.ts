import { constants, utils } from 'ethers';
import { describe, expect, it } from 'vitest';

import {
  LifiCrosschainTransfersRoute,
  findCheapestRoute,
  findFastestRoute,
  parseLifiRouteToCrosschainTransfersQuoteWithLifiData,
} from './lifi';

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

type LifiRoute = Parameters<
  typeof parseLifiRouteToCrosschainTransfersQuoteWithLifiData
>[0]['route'];

type MockLifiToken = {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  logoURI: string;
};

type MockGasCost = {
  estimate: string;
  amountUSD: string;
  token: MockLifiToken;
};

type MockFeeCost = {
  amount: string;
  amountUSD: string;
  included: boolean;
  token: MockLifiToken;
};

function createMockLifiStep({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  executionDuration = 30,
  feeCosts = [],
  gasCosts = [],
}: {
  fromToken: MockLifiToken;
  toToken: MockLifiToken;
  fromAmount: string;
  toAmount: string;
  executionDuration?: number;
  feeCosts?: MockFeeCost[];
  gasCosts?: MockGasCost[];
}) {
  return {
    action: {
      fromAmount,
      fromToken,
      toToken,
    },
    estimate: {
      approvalAddress: constants.AddressZero,
      executionDuration,
      feeCosts,
      fromAmountUSD: '1',
      gasCosts,
      toAmount,
      toAmountUSD: '2',
    },
    toolDetails: {
      key: 'test',
      name: 'Test',
      logoURI: '',
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

describe('parseLifiRouteToCrosschainTransfersQuoteWithLifiData', () => {
  it('uses the first step for source, the last step for destination, and totals gas and fees', () => {
    const ethToken = {
      chainId: 1,
      address: constants.AddressZero,
      symbol: 'ETH',
      decimals: 18,
      logoURI: '',
    };
    const robinhoodEthToken = {
      ...ethToken,
      chainId: 4663,
    };
    const muToken = {
      chainId: 4663,
      address: '0x00000000000000000000000000000000000000aa',
      symbol: 'MU',
      decimals: 18,
      logoURI: '',
    };
    const gasToken = {
      chainId: 1,
      address: '0x00000000000000000000000000000000000000bb',
      symbol: 'GAS',
      decimals: 18,
      logoURI: '',
    };
    const feeToken = {
      chainId: 1,
      address: '0x00000000000000000000000000000000000000cc',
      symbol: 'FEE',
      decimals: 18,
      logoURI: '',
    };
    const route = {
      steps: [
        createMockLifiStep({
          fromToken: ethToken,
          toToken: robinhoodEthToken,
          fromAmount: eth('1.1'),
          toAmount: eth('1'),
          executionDuration: 20,
          gasCosts: [
            {
              estimate: eth('0.01'),
              amountUSD: '1',
              token: gasToken,
            },
          ],
          feeCosts: [
            {
              amount: eth('0.02'),
              amountUSD: '4',
              included: false,
              token: feeToken,
            },
            {
              amount: eth('0.5'),
              amountUSD: '100',
              included: true,
              token: feeToken,
            },
          ],
        }),
        createMockLifiStep({
          fromToken: robinhoodEthToken,
          toToken: muToken,
          fromAmount: eth('1'),
          toAmount: eth('42'),
          executionDuration: 40,
          gasCosts: [
            {
              estimate: eth('0.03'),
              amountUSD: '2',
              token: gasToken,
            },
          ],
          feeCosts: [
            {
              amount: eth('0.04'),
              amountUSD: '6',
              included: false,
              token: feeToken,
            },
          ],
        }),
      ],
    } as unknown as LifiRoute;

    const result = parseLifiRouteToCrosschainTransfersQuoteWithLifiData({
      route,
      fromChainId: '1',
      toChainId: '4663',
    });

    expect(result.fromAmount.token.symbol).toBe('ETH');
    expect(result.fromAmount.amount).toBe(eth('1.1'));
    expect(result.toAmount.token.symbol).toBe('MU');
    expect(result.toAmount.token.address).toBe(muToken.address);
    expect(result.toAmount.amount).toBe(eth('42'));
    expect(result.durationMs).toBe(60_000);
    expect(result.gas.amount).toBe(eth('0.04'));
    expect(result.gas.amountUSD).toBe('3');
    expect(result.gas.token.address).toBe(gasToken.address);
    expect(result.fee.amount).toBe(eth('0.06'));
    expect(result.fee.amountUSD).toBe('10');
    expect(result.fee.token.address).toBe(feeToken.address);
  });
});

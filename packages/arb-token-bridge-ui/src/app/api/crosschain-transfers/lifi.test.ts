import { getRoutes } from '@lifi/sdk';
import { constants, utils } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import {
  LifiCrosschainTransfersRoute,
  findCheapestRoute,
  findFastestRoute,
  getLifiRoutes,
  parseLifiRoute,
} from './lifi';

vi.mock('@lifi/sdk', async (importActual) => ({
  ...(await importActual<typeof import('@lifi/sdk')>()),
  createConfig: vi.fn(),
  getRoutes: vi.fn(),
}));

const eth = (value: string) => utils.parseEther(value).toString();
const defaultToken = {
  symbol: 'ETH',
  decimals: 18,
  address: constants.AddressZero,
  logoURI: '',
};

function createMockRoute(
  overrides: Partial<{
    toAmount: string;
    durationMs: number;
  }> = {},
): LifiCrosschainTransfersRoute {
  return {
    type: 'lifi',
    durationMs: overrides.durationMs ?? 60_000,
    gas: [{ amount: '0', amountUSD: '0', token: defaultToken, chainId: 1 }],
    fee: [{ amount: '0', amountUSD: '0', token: defaultToken, chainId: 1 }],
    fromAmount: { amount: eth('1'), amountUSD: '1', token: defaultToken },
    toAmount: { amount: overrides.toAmount ?? eth('1'), amountUSD: '1', token: defaultToken },
    fromChainId: 1,
    toChainId: 42161,
    protocolData: {
      orders: [],
      route: {
        id: 'route-id',
        steps: [],
      } as unknown as LifiCrosschainTransfersRoute['protocolData']['route'],
    },
  };
}

function createMockLifiStep({
  id,
  tool,
  fromChainId,
  toChainId,
  fromAmount,
  toAmount,
  gasAmount,
  gasAmountUSD,
  feeAmount,
  feeAmountUSD,
  executionDuration,
}: {
  id: string;
  tool: string;
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  toAmount: string;
  gasAmount: string;
  gasAmountUSD: string;
  feeAmount: string;
  feeAmountUSD: string;
  executionDuration: number;
}) {
  const token = {
    ...defaultToken,
    chainId: fromChainId,
    name: 'Ether',
    priceUSD: '1',
  };
  const toToken = {
    ...defaultToken,
    chainId: toChainId,
    name: 'Ether',
    priceUSD: '1',
  };

  return {
    id,
    type: 'lifi',
    tool,
    toolDetails: {
      key: tool,
      name: tool,
      logoURI: `https://example.com/${tool}.png`,
    },
    action: {
      fromChainId,
      toChainId,
      fromAmount,
      fromToken: token,
      toToken,
    },
    estimate: {
      tool,
      fromAmount,
      toAmount,
      toAmountMin: toAmount,
      fromAmountUSD: '10',
      toAmountUSD: '9',
      approvalAddress: constants.AddressZero,
      executionDuration,
      gasCosts: [
        {
          type: 'SEND',
          price: '1',
          estimate: gasAmount,
          limit: gasAmount,
          amount: gasAmount,
          amountUSD: gasAmountUSD,
          token,
        },
      ],
      feeCosts: [
        {
          name: 'Bridge fee',
          description: 'Bridge fee',
          percentage: '0',
          token,
          amount: feeAmount,
          amountUSD: feeAmountUSD,
          included: false,
        },
      ],
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

describe('parseLifiRoute', () => {
  it('uses all steps for costs, duration, tools, and final output amount', () => {
    const firstStep = createMockLifiStep({
      id: 'step-1',
      tool: 'first-tool',
      fromChainId: 1,
      toChainId: 42161,
      fromAmount: '1000',
      toAmount: '900',
      gasAmount: '10',
      gasAmountUSD: '1',
      feeAmount: '20',
      feeAmountUSD: '2',
      executionDuration: 4,
    });
    const secondStep = createMockLifiStep({
      id: 'step-2',
      tool: 'second-tool',
      fromChainId: 42161,
      toChainId: 8453,
      fromAmount: '900',
      toAmount: '800',
      gasAmount: '30',
      gasAmountUSD: '3',
      feeAmount: '40',
      feeAmountUSD: '4',
      executionDuration: 6,
    });

    const route = parseLifiRoute({
      route: {
        id: 'multi-step-route',
        steps: [firstStep, secondStep],
      } as unknown as Parameters<typeof parseLifiRoute>[0]['route'],
      fromChainId: '1',
      toChainId: '8453',
    });

    expect(route.durationMs).toBe(10_000);
    expect(route.fromAmount.amount).toBe('1000');
    expect(route.toAmount.amount).toBe('800');
    expect(route.gas).toEqual([
      expect.objectContaining({
        amount: '10',
        amountUSD: '1',
        chainId: 1,
        estimate: '10',
        details: expect.objectContaining({ id: 'step-1-gas-0', via: 'first-tool' }),
      }),
      expect.objectContaining({
        amount: '30',
        amountUSD: '3',
        chainId: 42161,
        estimate: '30',
        details: expect.objectContaining({ id: 'step-2-gas-0', via: 'second-tool' }),
      }),
    ]);
    expect(route.fee).toEqual([
      expect.objectContaining({ amount: '20', amountUSD: '2', chainId: 1 }),
      expect.objectContaining({ amount: '40', amountUSD: '4', chainId: 42161 }),
    ]);
    expect(route.protocolData.route.steps[0]?.toolDetails).toEqual(firstStep.toolDetails);
    expect(route.protocolData.route.steps.map((step) => step.toolDetails)).toEqual([
      firstStep.toolDetails,
      secondStep.toolDetails,
    ]);
  });

  it('keeps per-step gas costs when one estimate is unavailable', () => {
    const firstStep = createMockLifiStep({
      id: 'step-1',
      tool: 'first-tool',
      fromChainId: 1,
      toChainId: 42161,
      fromAmount: '1000',
      toAmount: '900',
      gasAmount: '10',
      gasAmountUSD: '1',
      feeAmount: '20',
      feeAmountUSD: '2',
      executionDuration: 4,
    });
    const secondStep = createMockLifiStep({
      id: 'step-2',
      tool: 'second-tool',
      fromChainId: 1,
      toChainId: 8453,
      fromAmount: '900',
      toAmount: '800',
      gasAmount: '30',
      gasAmountUSD: '3',
      feeAmount: '40',
      feeAmountUSD: '4',
      executionDuration: 6,
    });

    (secondStep.estimate.gasCosts[0] as { estimate?: string }).estimate = undefined;

    const route = parseLifiRoute({
      route: {
        id: 'multi-step-route',
        steps: [firstStep, secondStep],
      } as unknown as Parameters<typeof parseLifiRoute>[0]['route'],
      fromChainId: '1',
      toChainId: '8453',
    });

    expect(route.gas).toEqual([
      expect.objectContaining({ amount: '10', amountUSD: '1', chainId: 1, estimate: '10' }),
      expect.objectContaining({
        amount: '30',
        amountUSD: '3',
        chainId: 1,
        estimate: undefined,
      }),
    ]);
  });
});

describe('getLifiRoutes', () => {
  it('requests routes with multi-step execution options enabled', async () => {
    vi.mocked(getRoutes).mockResolvedValueOnce({
      routes: [],
      unavailableRoutes: {
        failed: [],
        filteredOut: [],
      },
    } as Awaited<ReturnType<typeof getRoutes>>);

    await getLifiRoutes({
      fromChainId: 1,
      toChainId: 42161,
      fromTokenAddress: constants.AddressZero,
      toTokenAddress: constants.AddressZero,
      fromAmount: '1000',
    });

    expect(getRoutes).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          allowSwitchChain: true,
          allowDestinationCall: true,
        }),
      }),
    );
  });
});

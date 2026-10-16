import { type RouteExtended, getRoutes } from '@lifi/sdk';
import { constants } from 'ethers';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockLifiRoute } from '../../../test-utils/lifi';
import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../../wallet/ecosystems/solana';
import {
  GET,
  type LifiCrosschainTransfersRoute,
  Order,
  getLifiRoutes,
  parseLifiRoute,
} from './lifi';

vi.mock('../../../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});

vi.mock('@lifi/sdk', async (importActual) => ({
  ...(await importActual<typeof import('@lifi/sdk')>()),
  createConfig: vi.fn(),
  getRoutes: vi.fn(),
}));

const defaultToken = {
  symbol: 'ETH',
  decimals: 18,
  address: constants.AddressZero,
  logoURI: '',
};

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

  const step = {
    id,
    type: 'lifi',
    tool,
    includedSteps: [],
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
  } satisfies RouteExtended['steps'][number];

  return step;
}

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
        tags: [Order.Cheapest],
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
  it('disallows chain switches and destination calls for Earn routes', async () => {
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
          allowSwitchChain: false,
          allowDestinationCall: false,
        }),
      }),
    );
  });
});

describe('GET', () => {
  function createRequest() {
    const searchParams = new URLSearchParams({
      fromToken: constants.AddressZero,
      toToken: constants.AddressZero,
      fromChainId: '1',
      toChainId: '42161',
      fromAmount: '1000',
      slippage: '0.5',
    });

    return new NextRequest(`http://localhost/api/crosschain-transfers/lifi?${searchParams}`);
  }

  function createQuotedRoute(
    id: string,
    toAmount: string,
    executionDuration: number,
    tags?: Order[],
  ) {
    return createMockLifiRoute({
      id,
      tags,
      steps: [
        createMockLifiStep({
          id: `${id}-step`,
          tool: 'relay',
          fromChainId: 1,
          toChainId: 42161,
          fromAmount: '1000',
          toAmount,
          gasAmount: '10',
          gasAmountUSD: '1',
          feeAmount: '20',
          feeAmountUSD: '2',
          executionDuration,
        }),
      ],
    });
  }

  it('falls back to computed cheapest and fastest routes when LiFi omits tags', async () => {
    vi.mocked(getRoutes).mockResolvedValueOnce({
      routes: [createQuotedRoute('cheapest', '900', 10), createQuotedRoute('fastest', '800', 5)],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } as unknown as Awaited<ReturnType<typeof getRoutes>>);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      body.data.map((route: LifiCrosschainTransfersRoute) => route.protocolData.route.id),
    ).toEqual(['cheapest', 'fastest']);
  });

  it('returns only the tagged cheapest and fastest routes', async () => {
    vi.mocked(getRoutes).mockResolvedValueOnce({
      routes: [
        createQuotedRoute('cheapest', '900', 10, [Order.Cheapest]),
        createQuotedRoute('fastest', '800', 5, [Order.Fastest]),
        createQuotedRoute('extra', '850', 7),
      ],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } as unknown as Awaited<ReturnType<typeof getRoutes>>);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(
      body.data.map((route: LifiCrosschainTransfersRoute) => route.protocolData.route.id),
    ).toEqual(['cheapest', 'fastest']);
  });

  it('skips malformed routes without discarding valid routes', async () => {
    vi.mocked(getRoutes).mockResolvedValueOnce({
      routes: [{ id: 'malformed', steps: [] }, createQuotedRoute('valid', '900', 5)],
      unavailableRoutes: { failed: [], filteredOut: [] },
    } as unknown as Awaited<ReturnType<typeof getRoutes>>);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].protocolData.route.id).toBe('valid');
  });
});

describe.sequential('GET with a Solana source', () => {
  const solanaSender = 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5';
  const evmSender = '0x1111111111111111111111111111111111111111';

  function createRequest(params: Record<string, string> = {}) {
    const searchParams = new URLSearchParams({
      fromToken: SOLANA_NATIVE_TOKEN_ADDRESS,
      toToken: constants.AddressZero,
      fromChainId: String(ChainId.Solana),
      toChainId: String(ChainId.ArbitrumOne),
      fromAmount: '1000',
      slippage: '0.5',
      ...params,
    });

    return new NextRequest(`http://localhost/api/crosschain-transfers/lifi?${searchParams}`);
  }

  beforeEach(() => {
    vi.mocked(getRoutes).mockReset();
    vi.mocked(getRoutes).mockResolvedValue({
      routes: [],
      unavailableRoutes: { failed: [], filteredOut: [] },
    });
  });

  it.each([SOLANA_NATIVE_TOKEN_ADDRESS, CommonAddress.Solana.USDC, CommonAddress.Solana.USDT])(
    'accepts Solana token %s',
    async (fromToken) => {
      const response = await GET(createRequest({ fromToken }));

      expect(response.status).toBe(200);
      expect(getRoutes).toHaveBeenCalledWith(
        expect.objectContaining({ fromChainId: ChainId.Solana, fromTokenAddress: fromToken }),
      );
    },
  );

  it.each<Record<string, string>>([
    { toChainId: String(ChainId.Base) },
    { fromToken: 'not-a-solana-address' },
  ])('rejects unsupported or malformed requests: %o', async (params) => {
    const response = await GET(createRequest(params));

    expect(response.status).toBe(400);
    expect(getRoutes).not.toHaveBeenCalled();
  });

  it('does not default a cross-ecosystem recipient to the Solana sender', async () => {
    await GET(createRequest({ fromAddress: solanaSender }));

    expect(getRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ fromAddress: solanaSender, toAddress: undefined }),
    );
  });

  it('defaults an EVM recipient to the sender', async () => {
    await GET(
      createRequest({
        fromChainId: String(ChainId.Ethereum),
        fromToken: constants.AddressZero,
        fromAddress: evmSender,
      }),
    );

    expect(getRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ fromAddress: evmSender, toAddress: evmSender }),
    );
  });
});

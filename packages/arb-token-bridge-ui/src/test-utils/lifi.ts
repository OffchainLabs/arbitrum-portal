import type { RouteExtended } from '@lifi/sdk';

type CreateMockLifiRouteOptions = Partial<Omit<RouteExtended, 'id' | 'steps'>> & {
  id?: string;
  steps?: RouteExtended['steps'];
};

export function createMockLifiRoute({
  id = 'route-id',
  steps = [],
  ...overrides
}: CreateMockLifiRouteOptions = {}): RouteExtended {
  const firstStep = steps[0];
  const lastStep = steps.at(-1);
  const fromChainId = firstStep?.action.fromChainId ?? 1;
  const toChainId = lastStep?.action.toChainId ?? 42161;
  const fromToken = firstStep?.action.fromToken ?? {
    address: '0x0000000000000000000000000000000000000000',
    chainId: fromChainId,
    decimals: 18,
    name: 'Ether',
    priceUSD: '1',
    symbol: 'ETH',
  };
  const toToken = lastStep?.action.toToken ?? { ...fromToken, chainId: toChainId };

  return {
    id,
    insurance: { state: 'NOT_INSURABLE', feeAmountUsd: '0' },
    fromChainId,
    fromAmountUSD: firstStep?.estimate.fromAmountUSD ?? '0',
    fromAmount: firstStep?.action.fromAmount ?? '0',
    fromToken,
    toChainId,
    toAmountUSD: lastStep?.estimate.toAmountUSD ?? '0',
    toAmount: lastStep?.estimate.toAmount ?? '0',
    toAmountMin: lastStep?.estimate.toAmountMin ?? '0',
    toToken,
    steps,
    ...overrides,
  };
}

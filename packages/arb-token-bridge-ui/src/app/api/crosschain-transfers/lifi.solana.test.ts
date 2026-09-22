import { type LiFiStep, getRoutes } from '@lifi/sdk';
import { constants } from 'ethers';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockLifiRoute } from '../../../test-utils/lifi';
import { ChainId } from '../../../types/ChainId';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../../wallet/constants';
import { GET } from './lifi';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true'));

vi.mock('@lifi/sdk', async (importActual) => ({
  ...(await importActual<typeof import('@lifi/sdk')>()),
  createConfig: vi.fn(),
  getRoutes: vi.fn(),
}));

function request({
  fromChainId = ChainId.Solana,
  toChainId = ChainId.ArbitrumOne,
  fromToken = SOLANA_NATIVE_TOKEN_ADDRESS,
  toToken = constants.AddressZero,
}: {
  fromChainId?: number;
  toChainId?: number;
  fromToken?: string;
  toToken?: string;
} = {}) {
  const searchParams = new URLSearchParams({
    fromChainId: String(fromChainId),
    toChainId: String(toChainId),
    fromToken,
    toToken,
    fromAmount: '1000',
    slippage: '0.5',
  });
  return new NextRequest(`http://localhost/api/crosschain-transfers/lifi?${searchParams}`);
}

function quotedStep(id: string, fromChainId: number = ChainId.Solana): LiFiStep {
  const destinationChainId: number = ChainId.ArbitrumOne;
  const fromToken = {
    address: fromChainId === ChainId.Solana ? SOLANA_NATIVE_TOKEN_ADDRESS : constants.AddressZero,
    chainId: fromChainId,
    decimals: fromChainId === ChainId.Solana ? 9 : 18,
    name: fromChainId === ChainId.Solana ? 'Solana' : 'Ether',
    priceUSD: '1',
    symbol: fromChainId === ChainId.Solana ? 'SOL' : 'ETH',
  };
  const toToken = {
    address: constants.AddressZero,
    chainId: destinationChainId,
    decimals: 18,
    name: 'Ether',
    priceUSD: '1',
    symbol: 'ETH',
  };

  return {
    id,
    type: 'lifi',
    tool: 'mayan',
    toolDetails: { key: 'mayan', name: 'Mayan', logoURI: '' },
    action: {
      fromChainId,
      toChainId: ChainId.ArbitrumOne,
      fromAmount: '1000',
      fromToken,
      toToken,
    },
    estimate: {
      tool: 'mayan',
      fromAmount: '1000',
      toAmount: '900',
      toAmountMin: '890',
      approvalAddress: constants.AddressZero,
      executionDuration: 1,
    },
    includedSteps: [],
  };
}

describe.sequential('Solana LiFi request parsing', () => {
  beforeEach(() => {
    vi.mocked(getRoutes).mockReset();
    vi.mocked(getRoutes).mockResolvedValue({
      routes: [],
      unavailableRoutes: { failed: [], filteredOut: [] },
    });
  });

  it.each([SOLANA_NATIVE_TOKEN_ADDRESS, CommonAddress.Solana.USDC, CommonAddress.Solana.USDT])(
    'accepts production Solana token identity %s',
    async (fromToken) => {
      const response = await GET(request({ fromToken }));
      const body = await response.json();

      expect(response.status, JSON.stringify(body)).toBe(200);
      expect(getRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          fromChainId: ChainId.Solana,
          toChainId: ChainId.ArbitrumOne,
          fromTokenAddress: fromToken,
        }),
      );
    },
  );

  it.each([
    request({ toChainId: ChainId.Base }),
    request({
      fromChainId: ChainId.Ethereum,
      toChainId: ChainId.Solana,
      fromToken: constants.AddressZero,
      toToken: SOLANA_NATIVE_TOKEN_ADDRESS,
    }),
    request({ fromToken: 'not-a-solana-address' }),
  ])('rejects unsupported or malformed requests before route discovery', async (input) => {
    const response = await GET(input);

    expect(response.status).toBe(400);
    expect(getRoutes).not.toHaveBeenCalled();
  });

  it('does not return a multi-step route that the Solana starter cannot execute', async () => {
    const singleStepRoute = createMockLifiRoute({
      id: 'single-step',
      steps: [quotedStep('single-step')],
    });
    const multiStepRoute = createMockLifiRoute({
      id: 'multi-step',
      steps: [quotedStep('source-step'), quotedStep('destination-step', ChainId.ArbitrumOne)],
    });
    vi.mocked(getRoutes).mockResolvedValueOnce({
      routes: [multiStepRoute, singleStepRoute],
      unavailableRoutes: { failed: [], filteredOut: [] },
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].protocolData.route.id).toBe('single-step');
  });
});

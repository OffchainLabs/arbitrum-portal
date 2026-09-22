import type { LiFiStep, RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../app/api/crosschain-transfers/lifi';
import { createMockLifiRoute } from '../test-utils/lifi';
import { createMockSigners } from '../test-utils/signers';
import { ChainId } from '../types/ChainId';
import { BridgeTransferStarterFactory } from './BridgeTransferStarterFactory';
import { LifiTransferStarter } from './LifiTransferStarter';
import * as providers from './utils';

const signature = '5'.repeat(88);

function route(steps: LiFiStep[] = [step()]): LifiCrosschainTransfersRoute {
  return {
    type: 'lifi',
    durationMs: 1,
    gas: [],
    fee: [],
    fromAmount: { amount: '1', amountUSD: '1', token: token(ChainId.Solana) },
    toAmount: { amount: '1', amountUSD: '1', token: token(ChainId.ArbitrumOne) },
    fromChainId: ChainId.Solana,
    toChainId: ChainId.ArbitrumOne,
    protocolData: { route: createMockLifiRoute({ steps }) },
  };
}

function token(chainId: number) {
  return {
    chainId,
    address: '11111111111111111111111111111111',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    priceUSD: '1',
  };
}

function step(toChainId: number = ChainId.ArbitrumOne): LiFiStep {
  return {
    id: 'step',
    type: 'lifi',
    tool: 'mayan',
    toolDetails: { key: 'mayan', name: 'Mayan', logoURI: '' },
    action: {
      fromChainId: ChainId.Solana,
      toChainId,
      fromAmount: '1',
      fromToken: token(ChainId.Solana),
      toToken: token(toChainId),
      fromAddress: 'So11111111111111111111111111111111111111112',
    },
    estimate: {
      tool: 'mayan',
      fromAmount: '1',
      toAmount: '1',
      toAmountMin: '1',
      approvalAddress: '11111111111111111111111111111111',
      executionDuration: 1,
    },
    includedSteps: [],
  };
}

function transferProps() {
  return {
    amount: BigNumber.from(1),
    signers: createMockSigners(),
    switchChainAsync: vi.fn(),
    onRouteUpdate: vi.fn(),
    onRouteExecutionError: vi.fn(),
  };
}

describe('LifiTransferStarter from Solana', () => {
  it('executes multi-step routes through the shared LiFi executor', async () => {
    const quote = route([step(ChainId.Ethereum), step()]);
    const executedRoute = { ...quote.protocolData.route, id: 'executed' } as RouteExtended;
    const executeRoute = vi.fn(async () => ({ txHash: signature, route: executedRoute }));
    const props = transferProps();

    await expect(
      new LifiTransferStarter({ lifiRoute: quote }).transfer(props, { executeRoute }),
    ).resolves.toEqual({
      transferType: 'lifi',
      status: 'pending',
      sourceChainTransaction: { hash: signature, wait: expect.any(Function) },
      lifiRoute: executedRoute,
    });
    expect(executeRoute).toHaveBeenCalledExactlyOnceWith(quote.protocolData.route, props);
  });
});

describe('Solana gas estimates', () => {
  it('keeps quoted fees in lamports, including fees without a compute-unit estimate', async () => {
    const quote = route();
    quote.gas = [
      {
        chainId: ChainId.Solana,
        amount: '5000',
        estimate: '100000',
        token: token(ChainId.Solana),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
      {
        chainId: ChainId.Solana,
        amount: '2500',
        token: token(ChainId.Solana),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
      {
        chainId: ChainId.ArbitrumOne,
        amount: '200',
        estimate: '20',
        token: token(ChainId.ArbitrumOne),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
      {
        chainId: ChainId.Ethereum,
        amount: '999',
        estimate: '999',
        token: token(ChainId.Ethereum),
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
    ];
    const starter = new LifiTransferStarter({ lifiRoute: quote });
    await expect(starter.transferEstimateGas()).resolves.toEqual({
      estimatedParentChainGas: BigNumber.from(100000),
      estimatedChildChainGas: BigNumber.from(20),
      estimatedParentChainGasFee: BigNumber.from(7500),
      estimatedChildChainGasFee: BigNumber.from(200),
    });
  });

  it('creates the LiFi starter without EVM providers and uses the quoted fees', async () => {
    const provider = vi.spyOn(providers, 'getProviderForChainId').mockImplementation(() => {
      throw new Error('Solana estimates must not create an EVM provider');
    });
    try {
      const quote = route();
      quote.gas = [
        {
          chainId: ChainId.Solana,
          amount: '5000',
          estimate: '100000',
          token: token(ChainId.Solana),
          details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
        },
      ];
      const starter = BridgeTransferStarterFactory.create({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
        lifiRoute: quote,
      });
      expect(starter).toBeInstanceOf(LifiTransferStarter);
      await expect(starter.transferEstimateGas()).resolves.toMatchObject({
        estimatedParentChainGasFee: BigNumber.from(5000),
      });
      expect(provider).not.toHaveBeenCalled();
      expect(() =>
        BridgeTransferStarterFactory.create({
          sourceChainId: ChainId.Solana,
          destinationChainId: ChainId.ArbitrumOne,
        }),
      ).toThrow(/quote/i);
    } finally {
      provider.mockRestore();
    }
  });
});

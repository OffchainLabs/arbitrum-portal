import type { Route, RouteExtended } from '@lifi/sdk';
import { ChainType, config, resumeRoute } from '@lifi/sdk';
import { constants } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { prepareLifiTransactionForStorage } from '../hooks/useLifiMergedTransactionCacheStore';
import {
  createMockLifiBatchedTransaction,
  createMockLifiPartialTransaction,
} from '../test-utils/lifi';
import {
  getLifiRouteDisplaySteps,
  getLifiRouteHistorySteps,
  getLifiRouteToolsDetails,
  getLifiTransactionSnapshot,
} from './LifiRouteUtils';

const token = {
  address: constants.AddressZero,
  decimals: 18,
  logoURI: '',
  symbol: 'ETH',
};

describe('getLifiRouteToolsDetails', () => {
  it('returns LiFi as the fallback tool', () => {
    expect(getLifiRouteToolsDetails(undefined)).toEqual([
      { key: 'lifi', name: 'LiFi', logoURI: '/icons/lifi.svg' },
    ]);
  });

  it('uses included steps for the displayed token and tool flow', () => {
    const createDisplayStep = ({
      id,
      tool,
      toTokenSymbol,
    }: {
      id: string;
      tool: string;
      toTokenSymbol: string;
    }) => ({
      id,
      tool,
      toolDetails: {
        key: tool,
        name: tool,
        logoURI: `${tool}.svg`,
      },
      action: {
        toToken: { symbol: toTokenSymbol },
      },
    });
    const route = {
      steps: [
        {
          id: 'composite-bridge',
          includedSteps: [
            createDisplayStep({ id: 'wrap', tool: 'wrapper', toTokenSymbol: 'WETH' }),
            createDisplayStep({ id: 'bridge', tool: 'lifiIntents', toTokenSymbol: 'WETH' }),
          ],
        },
        {
          id: 'composite-swap',
          includedSteps: [createDisplayStep({ id: 'swap', tool: 'fly', toTokenSymbol: 'SPCX' })],
        },
      ],
    } as unknown as Route;

    const displaySteps = getLifiRouteDisplaySteps(route);

    expect(displaySteps.map((step) => step.id)).toEqual(['wrap', 'bridge', 'swap']);
    expect(displaySteps.map((step) => step.action.toToken.symbol)).toEqual([
      'WETH',
      'WETH',
      'SPCX',
    ]);
    expect(getLifiRouteToolsDetails(route).map((tool) => tool.key)).toEqual([
      'wrapper',
      'lifiIntents',
      'fly',
    ]);
  });
});

describe('getLifiTransactionSnapshot', () => {
  it('keeps the actual bridge output for the SDK when resuming a quoted multistep route', async () => {
    const tx = createMockLifiBatchedTransaction();
    const bridge = tx.lifiRoute?.steps[0];
    const swap = tx.lifiRoute?.steps[1];
    if (!tx.lifiRoute || !bridge?.execution || !swap) throw new Error('Missing fixture route');
    bridge.execution.toAmount = '900000';
    swap.action.fromAddress = tx.sender;
    swap.execution = undefined;
    const originalRoute = structuredClone(tx.lifiRoute);

    expect(getLifiTransactionSnapshot(tx)?.toAmount.amount).toBe('1000000');
    expect(getLifiRouteHistorySteps(tx.lifiRoute)[0]?.displaySteps[0]?.toAmount.amount).toBe(
      '900000',
    );
    const stored = prepareLifiTransactionForStorage(tx);
    expect(stored.lifiRoute).toEqual(originalRoute);
    expect(tx.lifiRoute).toEqual(originalRoute);
    if (!stored.lifiRoute) throw new Error('Unfinished route was pruned');

    const executeStep = vi.fn(async (step: RouteExtended['steps'][number]) => ({
      ...step,
      execution: { status: 'DONE' as const, process: [], toAmount: '890000', startedAt: 1 },
    }));
    const providers = config.get().providers;
    config.setProviders([
      {
        type: ChainType.EVM,
        isAddress: () => true,
        resolveAddress: async () => undefined,
        getBalance: async () => [],
        getStepExecutor: async () => ({
          allowUserInteraction: true,
          allowExecution: true,
          setInteraction: () => {},
          executeStep,
        }),
      },
    ]);
    try {
      await resumeRoute(structuredClone(stored.lifiRoute));
      expect(executeStep).toHaveBeenCalledOnce();
      expect(executeStep.mock.calls[0]?.[0].action.fromAmount).toBe('900000');
      expect(stored.lifiRoute).toEqual(originalRoute);
    } finally {
      config.setProviders(providers);
    }
  });

  it.each([undefined, 'not-a-price', 'Infinity'])(
    'keeps received output without persisting an invalid USD value when price is %s',
    (priceUSD) => {
      const tx = createMockLifiPartialTransaction();
      const receivedToken = tx.lifiRoute?.steps[0]?.execution?.toToken;
      if (!receivedToken) throw new Error('Missing fixture received token');
      if (priceUSD === undefined) {
        Reflect.deleteProperty(receivedToken, 'priceUSD');
      } else {
        receivedToken.priceUSD = priceUSD;
      }

      expect(getLifiTransactionSnapshot(tx)?.toAmount).toMatchObject({
        amount: '8126613689',
        token: { symbol: 'USDG' },
      });
      expect(
        getLifiRouteHistorySteps(tx.lifiRoute)[0]?.displaySteps.at(-1)?.toAmount,
      ).toMatchObject({
        amount: '16206962210',
        amountUSD: '0',
        token: { symbol: 'USDC' },
      });
    },
  );

  it('keeps the quote for the list and the received token for details', () => {
    const tx = createMockLifiPartialTransaction();

    expect(getLifiTransactionSnapshot(tx)?.toAmount).toMatchObject({
      amount: '8126613689',
      amountUSD: '8129.1852',
      token: { symbol: 'USDG', decimals: 6 },
    });
    expect(getLifiRouteHistorySteps(tx.lifiRoute)[0]?.displaySteps.at(-1)?.toAmount).toMatchObject({
      amount: '16206962210',
      amountUSD: '16206.96221',
      token: { symbol: 'USDC', decimals: 6 },
    });
  });

  it('preserves earlier included steps when applying a composite step result', () => {
    const tx = createMockLifiPartialTransaction();
    const bridge = tx.lifiRoute?.steps[0];
    const included = bridge?.includedSteps[0];
    if (!bridge || !included || included.type !== 'cross')
      throw new Error('Missing fixture bridge');
    bridge.includedSteps.unshift({
      ...included,
      id: 'intermediate-swap',
      toolDetails: { key: 'dex', name: 'DEX', logoURI: '' },
      action: { ...included.action, toToken: { ...included.action.toToken, symbol: 'USDT' } },
      estimate: { ...included.estimate, toAmount: '8120000000' },
    });

    const steps = getLifiRouteHistorySteps(tx.lifiRoute)[0]?.displaySteps;
    expect(steps).toHaveLength(2);
    expect(steps?.[0]?.toAmount).toMatchObject({ amount: '8120000000', token: { symbol: 'USDT' } });
    expect(steps?.[1]?.toAmount).toMatchObject({
      amount: '16206962210',
      token: { symbol: 'USDC' },
    });
  });

  it.each([undefined, 'PENDING', 'FAILED'] as const)(
    'keeps the final quote when the last step is %s',
    (status) => {
      const tx = createMockLifiPartialTransaction();
      const bridge = tx.lifiRoute?.steps[0];
      if (!tx.lifiRoute || !bridge?.execution) throw new Error('Missing fixture bridge');
      const swap: RouteExtended['steps'][number] = {
        ...bridge,
        id: 'destination-swap',
        includedSteps: [],
        action: { ...bridge.action, fromChainId: 1, fromToken: bridge.action.toToken },
        execution: status ? { ...bridge.execution, status } : undefined,
      };
      tx.lifiRoute.steps.push(swap);

      expect(getLifiTransactionSnapshot(tx)?.toAmount).toMatchObject({
        amount: '8126613689',
        token: { symbol: 'USDG' },
      });
      const steps = getLifiRouteHistorySteps(tx.lifiRoute);
      expect(steps[0]?.displaySteps.at(-1)?.toAmount).toMatchObject({
        amount: '16206962210',
        token: { symbol: 'USDC' },
      });
      expect(steps[1]?.displaySteps.at(-1)?.toAmount).toMatchObject({
        amount: '8126613689',
        token: { symbol: 'USDG' },
      });
    },
  );

  it('reads a canonical single-step transaction summary', () => {
    const snapshot = getLifiTransactionSnapshot({
      toolsDetails: [{ key: 'relay', name: 'Relay', logoURI: 'relay.svg' }],
      durationMs: 60_000,
      fromAmount: {
        amount: '100',
        amountUSD: '1',
        token,
      },
      toAmount: {
        amount: '90',
        amountUSD: '0.9',
        token,
      },
    });

    expect(snapshot?.fromAmount.amount.toString()).toBe('100');
    expect(snapshot?.toAmount.amount.toString()).toBe('90');
    expect(snapshot?.toolsDetails).toHaveLength(1);
  });

  it('reads a legacy transaction summary with singular tool details', () => {
    const toolDetails = { key: 'relay', name: 'Relay', logoURI: 'relay.svg' };
    const snapshot = getLifiTransactionSnapshot({
      toolDetails,
      durationMs: 60_000,
      fromAmount: {
        amount: '100',
        amountUSD: '1',
        token,
      },
      toAmount: {
        amount: '90',
        amountUSD: '0.9',
        token,
      },
    });

    expect(snapshot?.durationMs).toBe(60_000);
    expect(snapshot?.toolsDetails).toEqual([toolDetails]);
  });
});

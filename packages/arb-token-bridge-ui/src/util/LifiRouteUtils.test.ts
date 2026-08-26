import type { Route } from '@lifi/sdk';
import { constants } from 'ethers';
import { describe, expect, it } from 'vitest';

import {
  getLifiRouteDisplaySteps,
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

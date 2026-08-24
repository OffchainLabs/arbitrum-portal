import { describe, expect, it } from 'vitest';

import { WETH_TOKEN_LOGO } from '@/bridge/constants';

import { RouteContext } from './hooks/useRouteStore';
import { getAmountToPay } from './useTransferReadiness';

const eth = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  logoURI: WETH_TOKEN_LOGO,
};
const usdc = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  decimals: 6,
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
};

function getMock({
  gas,
  fee,
  fromAmount,
}: {
  gas: Omit<RouteContext['gas'][number], 'details' | 'chainId'> & { chainId?: number };
  fee: Omit<RouteContext['fee'][number], 'details' | 'chainId'> & { chainId?: number };
  fromAmount: RouteContext['fromAmount'];
}): RouteContext {
  return {
    type: 'lifi',
    gas: [
      {
        ...gas,
        chainId: gas.chainId ?? 1,
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
    ],
    fee: [
      {
        ...fee,
        chainId: fee.chainId ?? 1,
        details: { id: 'fee', label: 'Bridge fee', via: 'LI.FI' },
      },
    ],
    fromAmount,
    toAmount: {
      amount: '306496651855301',
      amountUSD: '1.1437',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        logoURI: WETH_TOKEN_LOGO,
      },
    },
    durationMs: 4000,
    fromChainId: 1,
    toChainId: 42161,
    protocolData: {
      route: { id: 'route-id', steps: [] } as unknown as RouteContext['protocolData']['route'],
    },
  };
}

describe('getAmountToPay', () => {
  it('should return the amount with token when token sent is the gas token', () => {
    const { amounts, fromAmountUsd } = getAmountToPay(
      getMock({
        gas: {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: '35000',
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: '306838702657301',
          amountUSD: '1.1450',
          token: eth,
        },
      }),
    );
    expect(fromAmountUsd).toBe(2.039);
    expect(amounts).toStrictEqual({
      '1:0x0000000000000000000000000000000000000000': {
        amount: '306838702762301',
        amountUSD: '2.039',
        token: {
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          logoURI: WETH_TOKEN_LOGO,
          symbol: 'ETH',
        },
        chainId: 1,
      },
    });
  });

  it('should return the different amounts with tokens when token sent is not the gas token', () => {
    const { amounts, fromAmountUsd } = getAmountToPay(
      getMock({
        gas: {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: '35000',
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: '10000000',
          amountUSD: '10',
          token: usdc,
        },
      }),
    );

    expect(fromAmountUsd).toBe(10.894);
    expect(amounts).toStrictEqual({
      '1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        amount: '10000000',
        amountUSD: '10',
        token: usdc,
        chainId: 1,
      },
      '1:0x0000000000000000000000000000000000000000': {
        amount: '105000',
        amountUSD: '0.894',
        token: eth,
        chainId: 1,
      },
    });
  });

  it('should keep native gas costs separated by chain', () => {
    const { amounts, fromAmountUsd } = getAmountToPay({
      ...getMock({
        gas: {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: '35000',
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: '10000000',
          amountUSD: '10',
          token: usdc,
        },
      }),
      gas: [
        {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
          chainId: 1,
          details: { id: 'source-gas', label: 'Source gas fee', via: 'LI.FI' },
        },
        {
          amount: '90000',
          amountUSD: '0.700',
          token: eth,
          chainId: 42161,
          details: { id: 'destination-gas', label: 'Destination gas fee', via: 'LI.FI' },
        },
      ],
    });

    expect(fromAmountUsd).toBe(11.594);
    expect(amounts['1:0x0000000000000000000000000000000000000000']).toMatchObject({
      amount: '105000',
      amountUSD: '0.894',
      chainId: 1,
    });
    expect(amounts['42161:0x0000000000000000000000000000000000000000']).toMatchObject({
      amount: '90000',
      amountUSD: '0.700',
      chainId: 42161,
    });
  });

  it('treats missing gas and fee USD values as zero', () => {
    const route = getMock({
      gas: {
        amount: '70000',
        amountUSD: '0',
        token: eth,
      },
      fee: {
        amount: '35000',
        amountUSD: '0',
        token: eth,
      },
      fromAmount: {
        amount: '10000000',
        amountUSD: '10',
        token: usdc,
      },
    });
    route.gas[0]!.amountUSD = undefined;
    route.fee[0]!.amountUSD = undefined;

    expect(getAmountToPay(route).fromAmountUsd).toBe(10);
  });
});

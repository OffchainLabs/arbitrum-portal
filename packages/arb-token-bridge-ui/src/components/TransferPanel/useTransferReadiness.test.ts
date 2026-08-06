import { BigNumber } from 'ethers';
import { describe, expect, it } from 'vitest';

import { WETH_TOKEN_LOGO } from '@/bridge/constants';

import type { AmountWithToken } from '../../state/app/state';
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
  gas: AmountWithToken;
  fee: AmountWithToken;
  fromAmount: AmountWithToken;
}): RouteContext {
  return {
    type: 'lifi',
    gas: [
      {
        ...gas,
        amount: gas.amount.toString(),
        estimate: gas.estimate?.toString(),
        chainId: gas.chainId ?? 1,
      },
    ],
    fee: [
      {
        ...fee,
        amount: fee.amount.toString(),
        estimate: fee.estimate?.toString(),
        chainId: fee.chainId ?? 1,
      },
    ],
    fromAmount: { ...fromAmount, amount: fromAmount.amount.toString() },
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
      orders: [],
      route: { id: 'route-id', steps: [] } as unknown as RouteContext['protocolData']['route'],
    },
  };
}

describe('getAmountToPay', () => {
  it('should return the amount with token when token sent is the gas token', () => {
    const { amounts, fromAmountUsd } = getAmountToPay(
      getMock({
        gas: {
          amount: BigNumber.from('70000'),
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: BigNumber.from('35000'),
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: BigNumber.from('306838702657301'),
          amountUSD: '1.1450',
          token: eth,
        },
      }),
    );
    expect(fromAmountUsd).toBe(2.039);
    expect(amounts).toStrictEqual({
      '1:0x0000000000000000000000000000000000000000': {
        amount: BigNumber.from('306838702657301').add('70000').add('35000'),
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
          amount: BigNumber.from('70000'),
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: BigNumber.from('35000'),
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: BigNumber.from('10000000'),
          amountUSD: '10',
          token: usdc,
        },
      }),
    );

    expect(fromAmountUsd).toBe(10.894);
    expect(amounts).toStrictEqual({
      '1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        amount: BigNumber.from('10000000'),
        amountUSD: '10',
        token: usdc,
        chainId: 1,
      },
      '1:0x0000000000000000000000000000000000000000': {
        amount: BigNumber.from('70000').add('35000'),
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
          amount: BigNumber.from('70000'),
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: BigNumber.from('35000'),
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: BigNumber.from('10000000'),
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
        },
        {
          amount: '90000',
          amountUSD: '0.700',
          token: eth,
          chainId: 42161,
        },
      ],
    });

    expect(fromAmountUsd).toBe(11.594);
    expect(amounts['1:0x0000000000000000000000000000000000000000']).toMatchObject({
      amount: BigNumber.from('70000').add('35000'),
      amountUSD: '0.894',
      chainId: 1,
    });
    expect(amounts['42161:0x0000000000000000000000000000000000000000']).toMatchObject({
      amount: BigNumber.from('90000'),
      amountUSD: '0.700',
      chainId: 42161,
    });
  });

  it('treats missing gas and fee USD values as zero', () => {
    const route = getMock({
      gas: {
        amount: BigNumber.from('70000'),
        amountUSD: '0',
        token: eth,
      },
      fee: {
        amount: BigNumber.from('35000'),
        amountUSD: '0',
        token: eth,
      },
      fromAmount: {
        amount: BigNumber.from('10000000'),
        amountUSD: '10',
        token: usdc,
      },
    });
    route.gas[0]!.amountUSD = undefined;
    route.fee[0]!.amountUSD = undefined;

    expect(getAmountToPay(route).fromAmountUsd).toBe(10);
  });
});

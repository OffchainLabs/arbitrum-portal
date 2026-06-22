import type { StatusResponse, Token } from '@lifi/types';
import { describe, expect, it } from 'vitest';

import { WithdrawalStatus } from '../../../../state/app/state';
import { transformLifiHistoryTransaction } from './transactions';

const wallet = '0x1111111111111111111111111111111111111111';
const usdcToken: Token = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: 1,
  decimals: 6,
  logoURI: '',
  name: 'USD Coin',
  priceUSD: '1',
  symbol: 'USDC',
};
const arbUsdcToken: Token = {
  ...usdcToken,
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  chainId: 42161,
};

function createStatusResponse(): StatusResponse {
  return {
    status: 'DONE',
    substatus: 'COMPLETED',
    tool: 'across',
    transactionId: 'lifi-transaction-id',
    sending: {
      txHash: '0xsource',
      chainId: 1,
      txLink: '',
      amount: '1000000',
      amountUSD: '1',
      token: usdcToken,
      gasPrice: '0',
      gasUsed: '0',
      gasToken: usdcToken,
      gasAmount: '0',
      gasAmountUSD: '0',
      timestamp: 1_700_000_000,
      includedSteps: [
        {
          fromAmount: '1000000',
          fromToken: usdcToken,
          toAmount: '990000',
          toToken: arbUsdcToken,
          tool: 'across',
          toolDetails: {
            key: 'across',
            logoURI: 'https://example.com/across.png',
            name: 'Across',
          },
        },
      ],
    },
    receiving: {
      txHash: '0xdestination',
      chainId: 42161,
      txLink: '',
      amount: '990000',
      amountUSD: '0.99',
      token: arbUsdcToken,
      gasPrice: '0',
      gasUsed: '0',
      gasToken: arbUsdcToken,
      gasAmount: '0',
      gasAmountUSD: '0',
      timestamp: 1_700_000_060,
    },
    feeCosts: [],
    lifiExplorerLink: '',
    fromAddress: wallet,
    toAddress: wallet,
    metadata: {
      integrator: '_arbitrum',
    },
  };
}

describe('transformLifiHistoryTransaction', () => {
  it('maps completed LiFi history by initiation time', () => {
    const statusResponse = createStatusResponse();

    expect(transformLifiHistoryTransaction({ wallet, statusResponse })).toMatchObject({
      txId: '0xsource',
      createdAt: 1_700_000_000_000,
      resolvedAt: 1_700_000_060_000,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      value: '1.0',
      destinationTxId: '0xdestination',
      isLifi: true,
    });
  });

  it('skips LiFi history when required display data is missing', () => {
    const statusResponse: StatusResponse = {
      status: 'FAILED',
      substatus: 'UNKNOWN_FAILED_ERROR',
      sending: {
        txHash: '0xsource',
        chainId: 1,
        txLink: '',
      },
    };

    expect(transformLifiHistoryTransaction({ wallet, statusResponse })).toBeNull();
  });
});

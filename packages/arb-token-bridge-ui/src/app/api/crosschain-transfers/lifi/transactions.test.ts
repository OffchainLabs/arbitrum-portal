import type { FullStatusData, StatusResponse, Token } from '@lifi/types';
import { describe, expect, it } from 'vitest';

import { WithdrawalStatus } from '../../../../state/app/state';
import { transformLifiHistoryTransaction, transformLifiHistoryTransactions } from './transactions';

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

function createStatusResponse({
  sourceChainId = 1,
  destinationChainId = 42161,
  amount = '1000000',
}: {
  sourceChainId?: number;
  destinationChainId?: number;
  amount?: string;
} = {}): FullStatusData {
  return {
    status: 'DONE',
    substatus: 'COMPLETED',
    tool: 'across',
    transactionId: 'lifi-transaction-id',
    sending: {
      txHash: '0xsource',
      chainId: sourceChainId,
      txLink: '',
      amount,
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
      chainId: destinationChainId,
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

  it('maps withdrawals to withdraw direction with parent/child chains resolved', () => {
    const statusResponse = createStatusResponse({ sourceChainId: 42161, destinationChainId: 1 });

    expect(transformLifiHistoryTransaction({ wallet, statusResponse })).toMatchObject({
      direction: 'withdraw',
      isWithdrawal: true,
      sourceChainId: 42161,
      destinationChainId: 1,
      parentChainId: 1,
      childChainId: 42161,
    });
  });

  it('keys Nova->ArbitrumOne sibling transfers like the UI (parent=Nova, child=One)', () => {
    // Nova->One is a LiFi sibling transfer; useNetworksRelationship sets Nova as the
    // parent, so the history transform must agree or the cached and API copies fail to
    // dedupe and the transfer shows twice.
    const statusResponse = createStatusResponse({
      sourceChainId: 42170,
      destinationChainId: 42161,
    });

    expect(transformLifiHistoryTransaction({ wallet, statusResponse })).toMatchObject({
      direction: 'deposit',
      isWithdrawal: false,
      sourceChainId: 42170,
      destinationChainId: 42161,
      parentChainId: 42170,
      childChainId: 42161,
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

  it('skips malformed LiFi history rows without dropping the batch', () => {
    const transactions = transformLifiHistoryTransactions({
      wallet,
      statusResponses: [createStatusResponse({ amount: 'not-a-number' }), createStatusResponse()],
    });

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      txId: '0xsource',
      value: '1.0',
    });
  });
});

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
const apeToken: Token = {
  address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
  chainId: 1,
  decimals: 18,
  logoURI: 'https://etherscan.io/token/images/apecoin_32.png',
  name: 'ApeCoin',
  priceUSD: '0.133701',
  symbol: 'APE',
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

  it('skips non-refunded same-chain LiFi history (Earn)', () => {
    const statusResponse = createStatusResponse({
      sourceChainId: 42161,
      destinationChainId: 42161,
    });

    expect(transformLifiHistoryTransaction({ wallet, statusResponse })).toBeNull();
  });

  it('keeps refunded same-chain LiFi history', () => {
    const statusResponse = {
      ...createStatusResponse({
        sourceChainId: 42161,
        destinationChainId: 42161,
      }),
      substatus: 'REFUNDED',
    } satisfies FullStatusData;

    expect(transformLifiHistoryTransaction({ wallet, statusResponse })).toMatchObject({
      txId: '0xsource',
      sourceChainId: 42161,
      destinationChainId: 42161,
      status: WithdrawalStatus.REFUNDED,
      destinationStatus: WithdrawalStatus.REFUNDED,
      destinationTxId: '0xdestination',
      isLifi: true,
    });
  });

  it('keeps pending LiFi history when destination token metadata is missing', () => {
    const statusResponse: StatusResponse = {
      status: 'PENDING',
      substatus: 'WAIT_DESTINATION_TRANSACTION',
      tool: 'glacis',
      transactionId: '0x5b5218c219951ef22b03135a7f2bb94af15c0eeb80af2f55b57f2b739fe1e339',
      sending: {
        txHash: '0xa80d1317610b29f1a9d1f4cef8fd330aeb9606e8e65ed46d9bb2918454dc3712',
        txLink:
          'https://etherscan.io/tx/0xa80d1317610b29f1a9d1f4cef8fd330aeb9606e8e65ed46d9bb2918454dc3712',
        token: apeToken,
        chainId: 1,
        gasPrice: '230492707',
        gasUsed: '592879',
        gasToken: usdcToken,
        gasAmount: '136654285633453',
        gasAmountUSD: '0.2254',
        amountUSD: '168.1311',
        value: '61424531524806',
        includedSteps: [],
        amount: '1257515872749456957793',
        timestamp: 1_781_830_547,
      },
      receiving: {
        chainId: 42161,
      },
      fromAddress: wallet,
      toAddress: wallet,
      metadata: {
        integrator: '_arbitrum',
      },
      feeCosts: [],
    };

    expect(transformLifiHistoryTransaction({ wallet, statusResponse })).toMatchObject({
      txId: '0xa80d1317610b29f1a9d1f4cef8fd330aeb9606e8e65ed46d9bb2918454dc3712',
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      value: '1257.515872749456957793',
      direction: 'deposit',
      isWithdrawal: false,
      sourceChainId: 1,
      destinationChainId: 42161,
      toAmount: {
        amount: '0',
        amountUSD: '0',
        token: {
          address: '0x0000000000000000000000000000000000000000',
          decimals: 0,
          logoURI: '',
          symbol: 'Unknown',
        },
      },
      destinationTxId: null,
    });
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

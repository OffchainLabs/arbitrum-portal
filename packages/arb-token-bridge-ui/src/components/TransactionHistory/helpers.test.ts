import type { StatusResponse, Token } from '@lifi/types';
import { describe, expect, it } from 'vitest';

import { WithdrawalStatus } from '../../state/app/state';
import { getLifiTransferStatus } from '../../util/LifiTransactionStatus';

const token: Token = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: 1,
  decimals: 18,
  logoURI: '',
  name: 'Ether',
  priceUSD: '0',
  symbol: 'ETH',
};

const baseStatusResponse = {
  tool: 'across',
  sending: {
    txHash: '0xsource',
    chainId: 1,
    txLink: '',
  },
  receiving: {
    chainId: 42161,
  },
};

describe('getLifiTransferStatus', () => {
  it('maps completed transfers to confirmed statuses and destination tx', () => {
    const statusResponse: StatusResponse = {
      ...baseStatusResponse,
      status: 'DONE',
      substatus: 'COMPLETED',
      transactionId: 'transaction-id',
      sending: {
        ...baseStatusResponse.sending,
        amount: '1',
        amountUSD: '1',
        gasAmount: '0',
        gasAmountUSD: '0',
        gasPrice: '0',
        gasToken: token,
        gasUsed: '0',
        token,
      },
      receiving: {
        ...baseStatusResponse.receiving,
        txHash: '0xdestination',
        txLink: '',
        amount: '1',
        amountUSD: '1',
        gasAmount: '0',
        gasAmountUSD: '0',
        gasPrice: '0',
        gasToken: token,
        gasUsed: '0',
        token,
      },
      feeCosts: [],
      fromAddress: '0x1111111111111111111111111111111111111111',
      lifiExplorerLink: '',
      metadata: { integrator: '_arbitrum' },
      toAddress: '0x1111111111111111111111111111111111111111',
    };

    expect(getLifiTransferStatus(statusResponse)).toEqual({
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      destinationTxId: '0xdestination',
    });
  });

  it('maps pending transfers with executed source tx to pending destination', () => {
    const statusResponse: StatusResponse = {
      ...baseStatusResponse,
      status: 'PENDING',
      substatus: 'WAIT_DESTINATION_TRANSACTION',
      sending: {
        ...baseStatusResponse.sending,
        timestamp: 1_700_000_000,
      },
    };

    expect(getLifiTransferStatus(statusResponse)).toEqual({
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      destinationTxId: null,
    });
  });

  it('maps failed transfers after source execution to destination failure', () => {
    const statusResponse: StatusResponse = {
      ...baseStatusResponse,
      status: 'FAILED',
      substatus: 'UNKNOWN_FAILED_ERROR',
      sending: {
        ...baseStatusResponse.sending,
        timestamp: 1_700_000_000,
      },
    };

    expect(getLifiTransferStatus(statusResponse)).toEqual({
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.FAILURE,
      destinationTxId: null,
    });
  });

  it('maps refunded transfers to refunded statuses', () => {
    const statusResponse: StatusResponse = {
      ...baseStatusResponse,
      status: 'DONE',
      substatus: 'REFUNDED',
      transactionId: 'transaction-id',
      sending: {
        ...baseStatusResponse.sending,
        amount: '1',
        amountUSD: '1',
        gasAmount: '0',
        gasAmountUSD: '0',
        gasPrice: '0',
        gasToken: token,
        gasUsed: '0',
        token,
      },
      receiving: {
        ...baseStatusResponse.receiving,
        txHash: '0xrefund',
        txLink: '',
        amount: '1',
        amountUSD: '1',
        gasAmount: '0',
        gasAmountUSD: '0',
        gasPrice: '0',
        gasToken: token,
        gasUsed: '0',
        token,
      },
      feeCosts: [],
      fromAddress: '0x1111111111111111111111111111111111111111',
      lifiExplorerLink: '',
      metadata: { integrator: '_arbitrum' },
      toAddress: '0x1111111111111111111111111111111111111111',
    };

    expect(getLifiTransferStatus(statusResponse)).toEqual({
      status: WithdrawalStatus.REFUNDED,
      destinationStatus: WithdrawalStatus.REFUNDED,
      destinationTxId: '0xrefund',
    });
  });
});

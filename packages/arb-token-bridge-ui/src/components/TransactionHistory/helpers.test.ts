import { getStatus } from '@lifi/sdk';
import type { StatusResponse, Token } from '@lifi/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { getLifiTransferStatus } from '../../util/LifiTransactionStatus';
import {
  getDestinationTransactionUrl,
  getSourceTransactionUrl,
  getUpdatedLifiTransfer,
  isSameTransaction,
} from './helpers';

vi.mock('@lifi/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lifi/sdk')>();

  return {
    ...actual,
    getStatus: vi.fn(),
  };
});

const token: Token = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: 1,
  decimals: 18,
  logoURI: '',
  name: 'Ether',
  priceUSD: '0',
  symbol: 'ETH',
};
const sourceTxHash = '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255';
const destinationTxHash = '0x7aca61daf6b90259aa8e40a57cba32a234650fa681691c53a0de09187226694c';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isSameTransaction', () => {
  it('matches LiFi transactions by route id when a batch id becomes a transaction hash', () => {
    expect(
      isSameTransaction(
        {
          txId: '0xbatch-id',
          parentChainId: 1,
          childChainId: 42161,
          lifiRoute: { id: 'route-id' },
        },
        {
          txId: sourceTxHash,
          parentChainId: 1,
          childChainId: 42161,
          lifiRoute: { id: 'route-id' },
        },
      ),
    ).toBe(true);
  });
});

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

const baseLifiTransaction: LifiMergedTransaction = {
  txId: '0xsource',
  asset: 'ETH',
  assetType: AssetType.ETH,
  blockNum: null,
  createdAt: 1_700_000_000_000,
  direction: 'deposit',
  isWithdrawal: false,
  resolvedAt: null,
  status: WithdrawalStatus.CONFIRMED,
  destinationStatus: WithdrawalStatus.CONFIRMED,
  uniqueId: null,
  value: '1',
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
  destination: '0x1111111111111111111111111111111111111111',
  sender: '0x1111111111111111111111111111111111111111',
  isLifi: true,
  tokenAddress: '0x0000000000000000000000000000000000000000',
  parentChainId: 1,
  childChainId: 42161,
  sourceChainId: 1,
  destinationChainId: 42161,
  toolDetails: { key: 'across', name: 'Across', logoURI: '' },
  durationMs: 0,
  fromAmount: {
    amount: '1000000000000000000',
    amountUSD: '1',
    token,
  },
  toAmount: {
    amount: '1000000000000000000',
    amountUSD: '1',
    token,
  },
  destinationTxId: '0xdestination',
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

  it('maps failed transfers after source execution to refunded destination', () => {
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
      destinationStatus: WithdrawalStatus.REFUNDED,
      destinationTxId: null,
    });
  });

  it('maps failed transfers before source execution to refunded source', () => {
    const statusResponse: StatusResponse = {
      ...baseStatusResponse,
      status: 'FAILED',
      substatus: 'UNKNOWN_FAILED_ERROR',
    };

    expect(getLifiTransferStatus(statusResponse)).toEqual({
      status: WithdrawalStatus.REFUNDED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
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

describe.sequential('getUpdatedLifiTransfer', () => {
  const destinationToken = { ...token, chainId: 42161 };
  const finalToken = {
    ...destinationToken,
    address: '0x2222222222222222222222222222222222222222',
    name: 'SPCX',
    symbol: 'SPCX',
  };

  function createRoute(swapStatus: 'DONE' | 'FAILED') {
    return {
      steps: [
        {
          id: 'bridge-step',
          tool: 'across',
          toolDetails: { key: 'across', name: 'Across', logoURI: '' },
          action: {
            fromChainId: 1,
            fromToken: token,
            fromAmount: '100',
            toChainId: 42161,
            toToken: destinationToken,
          },
          estimate: {
            executionDuration: 60,
            fromAmountUSD: '1',
            toAmount: '95',
            toAmountUSD: '0.95',
          },
          execution: {
            status: 'PENDING',
            process: [{ type: 'CROSS_CHAIN', status: 'PENDING', txHash: sourceTxHash }],
          },
        },
        {
          id: 'swap-step',
          tool: 'sushi',
          toolDetails: { key: 'sushi', name: 'Sushi', logoURI: '' },
          action: {
            fromChainId: 42161,
            fromToken: destinationToken,
            fromAmount: '95',
            toChainId: 42161,
            toToken: finalToken,
          },
          estimate: {
            executionDuration: 30,
            fromAmountUSD: '0.95',
            toAmount: '90',
            toAmountUSD: '0.9',
          },
          execution: {
            status: swapStatus,
            process: [{ type: 'SWAP', status: swapStatus, txHash: destinationTxHash }],
            ...(swapStatus === 'DONE' ? { toAmount: '89', toToken: finalToken } : {}),
          },
        },
      ],
    } as unknown as NonNullable<LifiMergedTransaction['lifiRoute']>;
  }

  const completedBridgeStatus = {
    ...baseStatusResponse,
    status: 'DONE',
    substatus: 'COMPLETED',
    receiving: {
      ...baseStatusResponse.receiving,
      txHash: destinationTxHash,
      amount: '95',
      amountUSD: '0.95',
      token: destinationToken,
    },
  } as unknown as StatusResponse;

  it('updates the completed bridge step without completing a failed later step', async () => {
    vi.mocked(getStatus).mockResolvedValueOnce(completedBridgeStatus);

    const updatedTransaction = (await getUpdatedLifiTransfer({
      ...baseLifiTransaction,
      txId: sourceTxHash,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: createRoute('FAILED'),
      toAmount: { amount: '90', amountUSD: '0.9', token: finalToken, chainId: 42161 },
    })) as LifiMergedTransaction;

    expect(updatedTransaction).toMatchObject({
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.FAILURE,
      toAmount: { amount: '90', token: finalToken },
    });
    expect(updatedTransaction.lifiRoute?.steps[0]?.execution).toMatchObject({
      status: 'DONE',
      toAmount: '95',
      toToken: destinationToken,
    });
    expect(updatedTransaction.lifiRoute?.steps[1]?.execution?.status).toBe('FAILED');
    expect(getStatus).toHaveBeenCalledWith({
      txHash: sourceTxHash,
      bridge: 'across',
      fromChain: '1',
      toChain: '42161',
    });
  });

  it('completes the transaction using the final output when all steps are done', async () => {
    vi.mocked(getStatus).mockResolvedValueOnce(completedBridgeStatus);

    await expect(
      getUpdatedLifiTransfer({
        ...baseLifiTransaction,
        txId: sourceTxHash,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: createRoute('DONE'),
      }),
    ).resolves.toMatchObject({
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      toAmount: { amount: '89', token: finalToken },
    });
  });
});

describe('transaction urls', () => {
  it('uses chain explorers for non-LiFi transfers', () => {
    expect(
      getSourceTransactionUrl({
        ...baseLifiTransaction,
        isLifi: false,
        depositStatus: DepositStatus.L2_SUCCESS,
      }),
    ).toBe('https://etherscan.io/tx/0xsource');
  });

  it('uses LiFi Scan for LiFi source and destination tx hashes', () => {
    expect(getSourceTransactionUrl(baseLifiTransaction)).toBe('https://scan.li.fi/tx/0xsource');
    expect(getDestinationTransactionUrl(baseLifiTransaction)).toBe(
      'https://scan.li.fi/tx/0xdestination',
    );
  });

  it('uses the LiFi explorer link from the API when present', () => {
    expect(
      getSourceTransactionUrl({
        ...baseLifiTransaction,
        lifiExplorerLink: 'https://scan.li.fi/tx/lifi-transaction-id',
      }),
    ).toBe('https://scan.li.fi/tx/lifi-transaction-id');
  });
});

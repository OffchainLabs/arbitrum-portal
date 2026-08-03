import { getStatus } from '@lifi/sdk';
import type { StatusResponse, Token } from '@lifi/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { createMockLifiRoute } from '../../test-utils/lifi';
import { getLifiTransferStatus } from '../../util/LifiTransactionStatus';
import {
  LIFI_TRANSACTION_SETTLE_AFTER_MS,
  getDestinationTransactionUrl,
  getLifiTransferDisplayStatus,
  getSourceTransactionUrl,
  getUpdatedLifiTransfer,
  isLifiTransferResumable,
  isSameTransaction,
  isTxFailed,
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
const finalStepTxHash = '0x9c25709d07f1cc9d852ce00ad0c5fcd1264690575ca104ded691cbc2f3bf6ee2';
const batchId = '0x3ed2270c44494ccfa9c60daf655e7879';
const batchId32Bytes = '0x5f4e4b452a390f349b7fc1f7b9b1666da36199b342de010996606ac8cea5ace1';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isSameTransaction', () => {
  it('matches LiFi transactions by route id when a batch id becomes a transaction hash', () => {
    expect(
      isSameTransaction(
        {
          txId: batchId,
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
    txHash: sourceTxHash,
    chainId: 1,
    txLink: '',
  },
  receiving: {
    chainId: 42161,
  },
};

const baseLifiTransaction: LifiMergedTransaction = {
  txId: sourceTxHash,
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
  toolsDetails: [{ key: 'across', name: 'Across', logoURI: '' }],
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
  destinationTxId: destinationTxHash,
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

  function createRouteWithSwapStatus(swapStatus: 'DONE' | 'FAILED') {
    return createMockLifiRoute({
      steps: [
        {
          id: 'bridge-step',
          type: 'lifi',
          tool: 'across',
          includedSteps: [],
          toolDetails: { key: 'across', name: 'Across', logoURI: '' },
          action: {
            fromChainId: 1,
            fromToken: token,
            fromAmount: '100',
            toChainId: 42161,
            toToken: destinationToken,
          },
          estimate: {
            tool: 'across',
            executionDuration: 60,
            fromAmount: '100',
            fromAmountUSD: '1',
            toAmount: '95',
            toAmountMin: '95',
            toAmountUSD: '0.95',
            approvalAddress: token.address,
          },
          execution: {
            status: 'PENDING',
            startedAt: 1,
            process: [
              { type: 'CROSS_CHAIN', status: 'PENDING', txHash: sourceTxHash, startedAt: 1 },
            ],
          },
        },
        {
          id: 'swap-step',
          type: 'lifi',
          tool: 'sushi',
          includedSteps: [],
          toolDetails: { key: 'sushi', name: 'Sushi', logoURI: '' },
          action: {
            fromChainId: 42161,
            fromToken: destinationToken,
            fromAmount: '95',
            toChainId: 42161,
            toToken: finalToken,
          },
          estimate: {
            tool: 'sushi',
            executionDuration: 30,
            fromAmount: '95',
            fromAmountUSD: '0.95',
            toAmount: '90',
            toAmountMin: '90',
            toAmountUSD: '0.9',
            approvalAddress: token.address,
          },
          execution: {
            status: swapStatus,
            startedAt: 2,
            process: [
              { type: 'SWAP', status: swapStatus, txHash: destinationTxHash, startedAt: 2 },
            ],
            ...(swapStatus === 'DONE' ? { toAmount: '89', toToken: finalToken } : {}),
          },
        },
      ],
    });
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
      lifiRoute: createRouteWithSwapStatus('FAILED'),
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
    expect(updatedTransaction.lifiRouteSteps).toHaveLength(2);
    expect(updatedTransaction.lifiRouteSteps?.[0]?.execution?.process[0]?.status).toBe('DONE');
    expect(updatedTransaction.lifiRouteSteps?.[1]?.execution?.process[0]?.status).toBe('FAILED');
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
        lifiRoute: createRouteWithSwapStatus('DONE'),
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
    ).toBe(`https://etherscan.io/tx/${sourceTxHash}`);
  });

  it('uses LiFi Scan for LiFi source and destination tx hashes', () => {
    expect(getSourceTransactionUrl(baseLifiTransaction)).toBe(
      `https://scan.li.fi/tx/${sourceTxHash}`,
    );
    expect(getDestinationTransactionUrl(baseLifiTransaction)).toBe(
      `https://scan.li.fi/tx/${destinationTxHash}`,
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

  it('uses the final route step for a multi-step LiFi destination link', () => {
    const transaction: LifiMergedTransaction = {
      ...baseLifiTransaction,
      lifiExplorerLink: `https://scan.li.fi/tx/${sourceTxHash}`,
      lifiRouteSteps: [
        {
          id: 'bridge-step',
          fromChainId: 1,
          displaySteps: [],
          execution: {
            process: [{ type: 'CROSS_CHAIN', status: 'DONE', txHash: sourceTxHash }],
          },
        },
        {
          id: 'swap-step',
          fromChainId: 42161,
          displaySteps: [],
          execution: {
            process: [{ type: 'SWAP', status: 'DONE', txHash: finalStepTxHash }],
          },
        },
      ],
    };

    expect(getSourceTransactionUrl(transaction)).toBe(`https://scan.li.fi/tx/${sourceTxHash}`);
    expect(getDestinationTransactionUrl(transaction)).toBe(
      `https://scan.li.fi/tx/${finalStepTxHash}`,
    );
  });

  it('does not build LiFi Scan links for EIP-5792 batch ids', () => {
    const transaction = {
      ...baseLifiTransaction,
      txId: batchId32Bytes,
      destinationTxId: null,
      lifiRoute: {
        id: 'batch-route',
        steps: [
          {
            execution: {
              process: [
                {
                  type: 'CROSS_CHAIN',
                  status: 'PENDING',
                  txHash: batchId32Bytes,
                  txType: 'batched',
                },
              ],
            },
          },
        ],
      } as unknown as LifiMergedTransaction['lifiRoute'],
    };

    expect(getSourceTransactionUrl(transaction)).toBe('');
    expect(getDestinationTransactionUrl(transaction)).toBe('');
  });

  it('uses route transaction explorer links after a batch id is resolved', () => {
    const sourceTxLink = `https://etherscan.io/tx/${sourceTxHash}`;
    const destinationTxLink = `https://arbiscan.io/tx/${destinationTxHash}`;
    const transaction: LifiMergedTransaction = {
      ...baseLifiTransaction,
      lifiRouteSteps: [
        {
          id: 'bridge-step',
          fromChainId: 1,
          displaySteps: [],
          execution: {
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'DONE',
                txHash: sourceTxHash,
                txLink: sourceTxLink,
              },
              {
                type: 'TRANSACTION',
                status: 'DONE',
                txHash: destinationTxHash,
                txLink: destinationTxLink,
              },
            ],
          },
        },
      ],
    };

    expect(getSourceTransactionUrl(transaction)).toBe(sourceTxLink);
    expect(getDestinationTransactionUrl(transaction)).toBe(destinationTxLink);
  });
});

describe('isLifiTransferResumable', () => {
  const unfinishedRoute = {
    steps: [{ execution: { status: 'DONE', process: [] } }, {}],
  } as unknown as LifiMergedTransaction['lifiRoute'];

  it.each([
    ['pending destination', WithdrawalStatus.UNCONFIRMED],
    ['failed destination', WithdrawalStatus.FAILURE],
    ['settled destination', WithdrawalStatus.CONFIRMED],
  ])('returns true for an unfinished route with a %s', (_name, destinationStatus) => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        destinationStatus,
        lifiRoute: unfinishedRoute,
      }),
    ).toBe(true);
  });

  it.each([
    ['legacy transaction', { lifiRoute: undefined }],
    [
      'single-step route',
      { lifiRoute: { steps: [{}] } as unknown as LifiMergedTransaction['lifiRoute'] },
    ],
    [
      'completed route',
      {
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: {
          steps: [{ execution: { status: 'DONE' } }, { execution: { status: 'DONE' } }],
        } as unknown as LifiMergedTransaction['lifiRoute'],
      },
    ],
    [
      'active route process',
      {
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: {
          steps: [
            {
              execution: {
                status: 'PENDING',
                process: [{ type: 'CROSS_CHAIN', status: 'PENDING' }],
              },
            },
            {},
          ],
        } as unknown as LifiMergedTransaction['lifiRoute'],
      },
    ],
  ])('returns false for a %s', (_name, overrides) => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        ...overrides,
      }),
    ).toBe(false);
  });

  it('allows an unresolved wallet batch to resume after the pending period', () => {
    const routeWithPendingBatchId = {
      steps: [
        {
          execution: {
            status: 'PENDING',
            process: [
              {
                type: 'CROSS_CHAIN',
                status: 'PENDING',
                txHash: batchId,
                txType: 'batched',
              },
            ],
          },
        },
        {},
      ],
    } as unknown as LifiMergedTransaction['lifiRoute'];
    const transaction = {
      ...baseLifiTransaction,
      createdAt: Date.now(),
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: routeWithPendingBatchId,
    };

    expect(isLifiTransferResumable(transaction)).toBe(false);
    expect(
      isLifiTransferResumable({
        ...transaction,
        createdAt: Date.now() - LIFI_TRANSACTION_SETTLE_AFTER_MS - 1,
      }),
    ).toBe(true);
  });
});

describe('isTxFailed', () => {
  it('treats a failed LiFi route as failed before a real transaction hash exists', () => {
    expect(
      isTxFailed({
        ...baseLifiTransaction,
        txId: batchId,
        status: WithdrawalStatus.UNCONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: {
          steps: [
            {
              execution: {
                status: 'FAILED',
                process: [
                  {
                    type: 'CROSS_CHAIN',
                    status: 'FAILED',
                    txHash: batchId,
                    txType: 'batched',
                  },
                ],
              },
            },
            {},
          ],
        } as unknown as LifiMergedTransaction['lifiRoute'],
      }),
    ).toBe(true);
  });
});

describe('getLifiTransferDisplayStatus', () => {
  const bridgeCompleteRoute = {
    steps: [
      {
        execution: {
          status: 'DONE',
          process: [{ type: 'CROSS_CHAIN', status: 'DONE' }],
        },
      },
      {},
    ],
  } as unknown as LifiMergedTransaction['lifiRoute'];

  it('keeps a recent unfinished transaction pending', () => {
    expect(
      getLifiTransferDisplayStatus({
        ...baseLifiTransaction,
        createdAt: Date.now(),
        destinationStatus: WithdrawalStatus.FAILURE,
        lifiRoute: bridgeCompleteRoute,
      }).destinationStatus,
    ).toBe(WithdrawalStatus.UNCONFIRMED);
  });

  it('settles an unfinished transaction after the pending period', () => {
    const transaction = {
      ...baseLifiTransaction,
      createdAt: Date.now() - LIFI_TRANSACTION_SETTLE_AFTER_MS - 1,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: bridgeCompleteRoute,
      fromAmount: {
        amount: '1000000000000000000',
        amountUSD: '1',
        token: { ...token, symbol: 'WETH' },
      },
      toAmount: {
        amount: '1000000000000000000',
        amountUSD: '1',
        token: { ...token, symbol: 'SPCX' },
      },
    };

    expect(getLifiTransferDisplayStatus(transaction)).toMatchObject({
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      fromAmount: { token: { symbol: 'WETH' } },
      toAmount: { token: { symbol: 'SPCX' } },
      lifiRoute: bridgeCompleteRoute,
    });
  });

  it('does not settle before the cross-chain transfer completes', () => {
    const transaction = {
      ...baseLifiTransaction,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: {
        steps: [{ execution: { status: 'PENDING', process: [] } }, {}],
      } as unknown as LifiMergedTransaction['lifiRoute'],
    };

    expect(getLifiTransferDisplayStatus(transaction)).toBe(transaction);
  });
});

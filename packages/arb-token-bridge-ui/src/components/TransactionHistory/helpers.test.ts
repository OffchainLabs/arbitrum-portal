import { getStatus } from '@lifi/sdk';
import type { StatusResponse, Token } from '@lifi/types';
import { BigNumber } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { getLifiTransferStatus } from '../../util/LifiTransactionStatus';
import {
  getDestinationTransactionUrl,
  getSourceTransactionUrl,
  getUpdatedLifiTransfer,
  isLifiTransferResumable,
  isSameTransaction,
} from './helpers';

vi.mock('@lifi/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lifi/sdk')>();

  return {
    ...actual,
    getStatus: vi.fn(),
  };
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
const batchId = '0x3ed2270c44494ccfa9c60daf655e7879';

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
    amount: BigNumber.from('1000000000000000000'),
    amountUSD: '1',
    token,
  },
  toAmount: {
    amount: BigNumber.from('1000000000000000000'),
    amountUSD: '1',
    token,
  },
  destinationTxId: destinationTxHash,
};

beforeEach(() => {
  vi.clearAllMocks();
});

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

  it('does not build LiFi Scan links for EIP-5792 batch ids', () => {
    expect(getSourceTransactionUrl({ ...baseLifiTransaction, txId: batchId })).toBe('');
  });
});

describe.sequential('getUpdatedLifiTransfer', () => {
  it('does not poll LiFi status with an EIP-5792 batch id', async () => {
    const tx = {
      ...baseLifiTransaction,
      txId: batchId,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: {
        steps: [
          {
            execution: {
              process: [
                {
                  type: 'CROSS_CHAIN',
                  status: 'PENDING',
                  txHash: batchId,
                },
              ],
            },
          },
        ],
      } as LifiMergedTransaction['lifiRoute'],
    };

    await expect(getUpdatedLifiTransfer(tx)).resolves.toBe(tx);
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('uses the real route transaction hash for status and updates the cached tx id', async () => {
    const statusResponse: StatusResponse = {
      ...baseStatusResponse,
      status: 'PENDING',
      substatus: 'WAIT_DESTINATION_TRANSACTION',
      sending: {
        ...baseStatusResponse.sending,
        timestamp: 1_700_000_000,
      },
    };
    const tx = {
      ...baseLifiTransaction,
      txId: batchId,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: {
        steps: [
          {
            execution: {
              process: [
                {
                  type: 'CROSS_CHAIN',
                  status: 'PENDING',
                  txHash: sourceTxHash,
                },
              ],
            },
          },
        ],
      } as LifiMergedTransaction['lifiRoute'],
    };

    vi.mocked(getStatus).mockResolvedValueOnce(statusResponse);

    await expect(getUpdatedLifiTransfer(tx)).resolves.toMatchObject({
      txId: sourceTxHash,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
    });
    expect(getStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: sourceTxHash,
      }),
    );
  });
});

describe('isLifiTransferResumable', () => {
  const multiStepRoute = {
    steps: [{}, {}],
  } as unknown as LifiMergedTransaction['lifiRoute'];
  const completedMultiStepRoute = {
    steps: [
      {
        execution: {
          status: 'DONE',
        },
      },
      {
        execution: {
          status: 'DONE',
        },
      },
    ],
  } as unknown as LifiMergedTransaction['lifiRoute'];
  const activeMultiStepRoute = {
    steps: [
      {
        execution: {
          status: 'PENDING',
          process: [
            {
              type: 'CROSS_CHAIN',
              status: 'PENDING',
              txHash: '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255',
              startedAt: 1,
            },
          ],
        },
      },
      {},
    ],
  } as unknown as LifiMergedTransaction['lifiRoute'];

  it('returns true for pending LiFi transactions with a multi-step route', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.UNCONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: multiStepRoute,
      }),
    ).toBe(true);
  });

  it('returns true for LiFi transactions confirmed on source and pending on destination with a multi-step route', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.CONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: multiStepRoute,
      }),
    ).toBe(true);
  });

  it('returns false for pending LiFi transactions with a single-step route', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.UNCONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: {
          steps: [{}],
        } as unknown as LifiMergedTransaction['lifiRoute'],
      }),
    ).toBe(false);
  });

  it('returns false for legacy LiFi transactions without a saved route', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.CONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: undefined,
      }),
    ).toBe(false);
  });

  it('returns false for terminal LiFi transactions with a multi-step route', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.CONFIRMED,
        destinationStatus: WithdrawalStatus.CONFIRMED,
        lifiRoute: multiStepRoute,
      }),
    ).toBe(false);
  });

  it('returns false once the LiFi destination is confirmed even if the source status is stale', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.UNCONFIRMED,
        destinationStatus: WithdrawalStatus.CONFIRMED,
        lifiRoute: multiStepRoute,
      }),
    ).toBe(false);
  });

  it('returns false when every saved LiFi route step is already done', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.CONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: completedMultiStepRoute,
      }),
    ).toBe(false);
  });

  it('returns false while a LiFi route process is still pending', () => {
    expect(
      isLifiTransferResumable({
        ...baseLifiTransaction,
        status: WithdrawalStatus.CONFIRMED,
        destinationStatus: WithdrawalStatus.UNCONFIRMED,
        lifiRoute: activeMultiStepRoute,
      }),
    ).toBe(false);
  });
});

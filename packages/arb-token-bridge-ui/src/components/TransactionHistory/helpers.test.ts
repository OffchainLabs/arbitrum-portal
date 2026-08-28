import {
  EthDepositMessage,
  EthDepositMessageStatus,
  ParentToChildMessageReader,
  ParentToChildMessageStatus,
} from '@arbitrum/sdk';
import { getStatus } from '@lifi/sdk';
import type { StatusResponse, Token } from '@lifi/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import {
  DepositStatus,
  LifiMergedTransaction,
  MergedTransaction,
  WithdrawalStatus,
} from '../../state/app/state';
import { ChainId } from '../../types/ChainId';
import { getLifiTransferStatus } from '../../util/LifiTransactionStatus';
import { getParentToChildMessageDataFromParentTxHash } from '../../util/deposits/helpers';
import {
  getDestinationTransactionUrl,
  getSourceTransactionUrl,
  getUpdatedEthDeposit,
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

// Only the SDK lookup is stubbed. `isEthDepositMessage` stays real, so the tests exercise the same
// narrowing that decides which message kind a deposit is.
vi.mock('../../util/deposits/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../util/deposits/helpers')>();

  return {
    ...actual,
    getParentToChildMessageDataFromParentTxHash: vi.fn(),
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

describe('getUpdatedEthDeposit', () => {
  // Sender and destination match on both fixtures. That used to be what told the two message kinds
  // apart, so these tests pin the flag the classification now relies on.
  const SENDER = '0xee7300250a9745c2bA636254a486334bb8120d0a';
  const NATIVE_TOKEN_DEPOSIT_TX_ID =
    '0x8b6eb5b1d0f9b06b1d0e3a5e0a1cf0ef1e3d5e1b7c8a9f0d2e4b6a8c0e2f4a6b';
  const RETRYABLE_TX_ID = '0x21f72d0003dea33e0cce1d2655d680e72dbcddc3e34baea4645363318f91dbd8';
  const CHILD_TX_HASH = '0x3c9a1f7e5b2d8c4a6e0f2b4d6a8c0e2f4a6b8d0c2e4f6a8b0d2c4e6f8a0b2d4c';
  const RETRYABLE_CREATION_ID =
    '0x7534111b0bc2dd4d04a9d1d29236b7bb81830b8d21e3e826b13114304492e5c1';

  function createPendingNativeTokenDeposit(txId: string): MergedTransaction {
    return {
      sender: SENDER,
      destination: SENDER,
      direction: 'deposit-l1',
      status: 'pending',
      createdAt: 1_787_341_919_000,
      resolvedAt: null,
      txId,
      asset: 'ETH',
      assetType: AssetType.ETH,
      value: '0.611126206084167590',
      uniqueId: null,
      isWithdrawal: false,
      blockNum: 25_805_722,
      tokenAddress: null,
      depositStatus: DepositStatus.L2_PENDING,
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne,
      sourceChainId: ChainId.Ethereum,
      destinationChainId: ChainId.ArbitrumOne,
    };
  }

  // Keyed by tx id rather than by call order, because the suite runs concurrently.
  beforeEach(() => {
    vi.mocked(getParentToChildMessageDataFromParentTxHash).mockImplementation(
      async ({ depositTxId }) => {
        if (depositTxId === NATIVE_TOKEN_DEPOSIT_TX_ID) {
          return {
            isClassic: false,
            parentToChildMsg: {
              childTxHash: CHILD_TX_HASH,
              status: async () => EthDepositMessageStatus.DEPOSITED,
            } as unknown as EthDepositMessage,
          };
        }

        return {
          isClassic: false,
          parentToChildMsg: {
            retryableCreationId: RETRYABLE_CREATION_ID,
            getSuccessfulRedeem: async () => ({
              status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
            }),
          } as unknown as ParentToChildMessageReader,
        };
      },
    );
  });

  it('marks a deposited native token deposit message as such and reports success', async () => {
    const updatedDeposit = await getUpdatedEthDeposit(
      createPendingNativeTokenDeposit(NATIVE_TOKEN_DEPOSIT_TX_ID),
    );

    expect(updatedDeposit.parentToChildMsgData).toMatchObject({
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
      isNativeTokenDepositMessage: true,
    });
    expect(updatedDeposit.depositStatus).toBe(DepositStatus.L2_SUCCESS);
  });

  it('leaves an unredeemed native token retryable unmarked and reports failure', async () => {
    const updatedDeposit = await getUpdatedEthDeposit(
      createPendingNativeTokenDeposit(RETRYABLE_TX_ID),
    );

    expect(updatedDeposit.parentToChildMsgData).toMatchObject({
      status: ParentToChildMessageStatus.FUNDS_DEPOSITED_ON_CHILD,
    });
    expect(updatedDeposit.parentToChildMsgData?.isNativeTokenDepositMessage).toBeUndefined();
    expect(updatedDeposit.depositStatus).toBe(DepositStatus.L2_FAILURE);
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

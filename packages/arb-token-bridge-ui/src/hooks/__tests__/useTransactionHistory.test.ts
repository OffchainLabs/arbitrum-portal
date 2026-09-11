import type { RouteExtended } from '@lifi/sdk';
import * as lifiSdk from '@lifi/sdk';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { Address } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as transactionHelpers from '../../components/TransactionHistory/helpers';
import {
  DepositStatus,
  LifiMergedTransaction,
  MergedTransaction,
  WithdrawalStatus,
} from '../../state/app/state';
import { createMockLifiBatchedTransaction } from '../../test-utils/lifi';
import { rejectLifiRouteBatchId } from '../../util/LifiTransactionStatus';
import { AssetType } from '../arbTokenBridge.types';
import { useArbQueryParams } from '../useArbQueryParams';
import { useLifiMergedTransactionCacheStore } from '../useLifiMergedTransactionCacheStore';
import {
  getDedupedTransactionsForPagination,
  mergeTransactions,
  useTransactionHistory,
} from '../useTransactionHistory';

const wallets = {
  WALLET_MULTIPLE_TX: '0x1798440327d78ebb19db0c8999e2368eaed8f413',
  WALLET_SINGLE_TX: '0x6d051646D4A9df8679E9AD3429e70415f75f6499',
  WALLET_EMPTY: '0xa5801D65537dF15e90D284E5E917AE84e3F3201c',
} as const;

const MERGE_TEST_ADDRESS = '0x1111111111111111111111111111111111111111';
const batchId32Bytes = '0x5f4e4b452a390f349b7fc1f7b9b1666da36199b342de010996606ac8cea5ace1';
const secondBatchId = '0x3ed2270c44494ccfa9c60daf655e7879d71c83a594c523ee17f80a659aa0d281';
const resolvedBatchTxHash = '0xa0231341aef0576cd9467d1506011d1dd041167762db0d2b1657678e3c0c5255';
const secondResolvedBatchTxHash =
  '0x9c25709d07f1cc9d852ce00ad0c5fcd1264690575ca104ded691cbc2f3bf6ee2';
const acceptedSourceTxHash = '0x7aca61daf6b90259aa8e40a57cba32a234650fa681691c53a0de09187226694c';

const wagmiMocks = vi.hoisted(() => ({
  address: '0x1111111111111111111111111111111111111111' as Address,
  connector: null as object | null,
  config: {},
}));
const getCallsStatusMock = vi.hoisted(() => vi.fn());

vi.mock('@lifi/sdk', async (importActual) => ({
  ...(await importActual<typeof import('@lifi/sdk')>()),
  getStatus: vi.fn(),
}));

const mergeTestBaseTx = {
  asset: 'ETH',
  assetType: AssetType.ETH,
  blockNum: null,
  resolvedAt: null,
  uniqueId: null as BigNumber | null,
  value: '1',
  tokenAddress: null,
  parentChainId: 1,
  childChainId: 42161,
  sourceChainId: 1,
  destinationChainId: 42161,
  sender: MERGE_TEST_ADDRESS,
  destination: MERGE_TEST_ADDRESS,
};

const lifiTestBaseTx: LifiMergedTransaction = {
  ...mergeTestBaseTx,
  txId: '0xlifi',
  createdAt: 1_700_000_000_000,
  direction: 'deposit',
  status: WithdrawalStatus.UNCONFIRMED,
  destinationStatus: WithdrawalStatus.UNCONFIRMED,
  isWithdrawal: false,
  isLifi: true,
  tokenAddress: '0x0000000000000000000000000000000000000000',
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
  toolsDetails: [{ key: 'across', name: 'Across', logoURI: '' }],
  durationMs: 0,
  fromAmount: {
    amount: '1',
    amountUSD: '1',
    token: {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      logoURI: '',
      symbol: 'ETH',
    },
  },
  toAmount: {
    amount: '1',
    amountUSD: '1',
    token: {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      logoURI: '',
      symbol: 'ETH',
    },
  },
  destinationTxId: null,
};

const unknownLifiDestinationAmount: LifiMergedTransaction['toAmount'] = {
  amount: '0',
  amountUSD: '0',
  token: {
    address: '0x0000000000000000000000000000000000000000',
    decimals: 0,
    logoURI: '',
    symbol: 'Unknown',
  },
};

/**
 * Creates a test case configuration for transaction history testing.
 * @param config - Test case configuration
 * @param config.key - The wallet key from the wallets object to use for testing
 * @param config.enabled - Whether the transaction history feature is enabled
 * @param config.expectedPagesTxCounts - Array of expected transaction counts for each paginated batch
 * @returns Test case object with the provided configuration
 */
const createTestCase = ({
  key,
  enabled,
  expectedPagesTxCounts,
}: {
  key: keyof typeof wallets;
  enabled: boolean;
  expectedPagesTxCounts: number[];
}) => ({ key, enabled, expectedPagesTxCounts });

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
  useConfig: () => wagmiMocks.config,
  useAccount: () => ({
    address: wagmiMocks.address,
    isConnected: true,
    chain: { id: 11155111 },
    connector: wagmiMocks.connector,
  }),
}));

vi.mock('@wagmi/core', async (importActual) => ({
  ...(await importActual()),
  getCallsStatus: getCallsStatusMock,
}));

vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual()),
  usePathname: vi.fn().mockReturnValue('/bridge'),
}));

vi.mock('../useArbQueryParams', async (importActual) => ({
  ...(await importActual()),
  useArbQueryParams: vi.fn().mockReturnValue([{}, vi.fn()]),
}));

const renderHookAsyncUseTransactionHistory = async (address: Address) => {
  const hook = renderHook(() => useTransactionHistory(address, { runFetcher: true }));

  return { result: hook.result };
};

function enableTransactionHistory() {
  const [currentParams, setParams] = vi.mocked(useArbQueryParams)();
  vi.mocked(useArbQueryParams).mockReturnValue([
    { ...currentParams, sourceChain: 11155111, disabledFeatures: [] },
    setParams,
  ]);
}

function createBatchedLifiTestTransaction(routeId: string): LifiMergedTransaction {
  return {
    ...lifiTestBaseTx,
    txId: routeId,
    showInHistory: false,
    lifiRoute: {
      id: routeId,
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
}

function createMixedLifiTestTransaction(routeId: string): LifiMergedTransaction {
  const transaction = createBatchedLifiTestTransaction(routeId);
  return {
    ...transaction,
    txId: acceptedSourceTxHash,
    showInHistory: true,
    lifiRoute: {
      ...transaction.lifiRoute,
      steps: [
        {
          execution: {
            status: 'DONE',
            process: [{ type: 'CROSS_CHAIN', status: 'DONE', txHash: acceptedSourceTxHash }],
          },
        },
        ...(transaction.lifiRoute?.steps ?? []),
      ],
    } as NonNullable<LifiMergedTransaction['lifiRoute']>,
  };
}

describe.sequential('useTransactionHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    wagmiMocks.address = MERGE_TEST_ADDRESS;
    wagmiMocks.connector = null;
    useLifiMergedTransactionCacheStore.setState({ transactions: {} });
  });

  it('keeps newer SDK progress when an earlier status request finishes', async () => {
    enableTransactionHistory();
    const transaction = { ...lifiTestBaseTx, txId: acceptedSourceTxHash };
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });
    let releaseStatus = () => {};
    const statusResponse = new Promise<void>((resolve) => {
      releaseStatus = resolve;
    });
    vi.spyOn(transactionHelpers, 'getUpdatedLifiTransfer').mockImplementation(async (tx) => {
      await statusResponse;
      return tx;
    });
    const { result } = renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS));

    const pendingUpdate = result.current.updatePendingTransaction(transaction);
    const completedTransaction = {
      ...transaction,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
    };
    await act(async () => {
      useLifiMergedTransactionCacheStore.getState().updateTransaction(completedTransaction);
      releaseStatus();
      await pendingUpdate;
    });

    expect(useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS]).toEqual([
      completedTransaction,
    ]);
  });

  it('shows the rejected destination batch instead of an older pending history page', () => {
    const pending = createMockLifiBatchedTransaction();
    if (!pending.lifiRoute) throw new Error('Expected a saved route');
    const rejected = {
      ...pending,
      lifiRoute: rejectLifiRouteBatchId({
        route: pending.lifiRoute,
        batchId: `0x${'3'.repeat(64)}`,
      }),
    };
    const [displayed] = mergeTransactions({
      address: MERGE_TEST_ADDRESS,
      newTransactions: [rejected],
      fetchedTransactions: [[pending]],
    });
    if (!displayed) throw new Error('Expected the accepted source transaction in history');
    expect(transactionHelpers.isTxFailed(displayed)).toBe(true);
    expect(displayed).toMatchObject({ lifiRoute: rejected.lifiRoute });
  });

  it('preserves a rejected destination batch after a stale poll and reload', async () => {
    enableTransactionHistory();
    const pending = createMockLifiBatchedTransaction();
    if (!pending.lifiRoute) throw new Error('Expected a saved route');
    const rejected = {
      ...pending,
      lifiRoute: rejectLifiRouteBatchId({
        route: pending.lifiRoute,
        batchId: `0x${'3'.repeat(64)}`,
      }),
    };
    useLifiMergedTransactionCacheStore.getState().addTransaction(rejected);
    vi.mocked(lifiSdk.getStatus).mockResolvedValue({
      status: 'PENDING',
      substatus: 'WAIT_DESTINATION_TRANSACTION',
      tool: 'relay',
      sending: {
        txHash: pending.txId,
        chainId: pending.sourceChainId,
        txLink: `https://arbiscan.io/tx/${pending.txId}`,
      },
      receiving: { chainId: pending.destinationChainId },
    });
    const { result, unmount } = renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS));

    await act(async () => {
      await result.current.updatePendingTransaction(pending);
    });
    unmount();
    const persisted = localStorage.getItem('lifi-merged-transaction-cache');
    if (!persisted) throw new Error('Expected persisted transaction history');
    useLifiMergedTransactionCacheStore.setState({ transactions: {} });
    localStorage.setItem('lifi-merged-transaction-cache', persisted);
    await useLifiMergedTransactionCacheStore.persist.rehydrate();

    const [reloaded] =
      useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS] ?? [];
    if (!reloaded) throw new Error('Expected the source transaction to survive reload');
    expect(transactionHelpers.isTxFailed(reloaded)).toBe(true);
    expect(reloaded.lifiRoute).toEqual(rejected.lifiRoute);
    expect(transactionHelpers.isTxPending(reloaded)).toBe(false);
  });

  it('polls wallet batches only from the history fetcher', async () => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    getCallsStatusMock.mockImplementation(() => new Promise(() => {}));
    const transaction = createBatchedLifiTestTransaction('single-poller');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    renderHook(() => {
      useTransactionHistory(MERGE_TEST_ADDRESS);
      useTransactionHistory(MERGE_TEST_ADDRESS);
    });

    await act(async () => {});
    expect(getCallsStatusMock).not.toHaveBeenCalled();

    renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }));
    await waitFor(() => expect(getCallsStatusMock).toHaveBeenCalled());
  });

  it('replaces a cached batch id with the final route transaction hash', async () => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    getCallsStatusMock.mockResolvedValue({
      chainId: 1,
      receipts: [{ transactionHash: resolvedBatchTxHash }],
      status: 'success',
    });
    const transaction = createBatchedLifiTestTransaction('batch-route');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }));

    await waitFor(() => {
      const [updatedTransaction] =
        useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS] ?? [];
      expect(updatedTransaction?.txId).toBe(resolvedBatchTxHash);
      expect(updatedTransaction?.lifiRoute?.steps[0]?.execution?.process[0]).toMatchObject({
        txHash: resolvedBatchTxHash,
        txLink: `https://etherscan.io/tx/${resolvedBatchTxHash}`,
      });
    });
  });

  it('keeps an accepted route transaction when a later wallet batch is rejected', async () => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    getCallsStatusMock.mockRejectedValue(new Error('bundle id is unknown'));
    const transaction = createMixedLifiTestTransaction('mixed-rejected-batch-route');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }));

    await waitFor(() => {
      const [updatedTransaction] =
        useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS] ?? [];
      expect(updatedTransaction?.txId).toBe(acceptedSourceTxHash);
      expect(updatedTransaction?.lifiRoute?.steps[1]?.execution).toMatchObject({
        status: 'FAILED',
        process: [expect.objectContaining({ status: 'FAILED' })],
      });
      expect(updatedTransaction?.lifiRoute?.steps[1]?.execution?.process[0]).not.toHaveProperty(
        'txHash',
      );
    });
  });

  it('keeps the first accepted transaction as route identity when a later batch resolves', async () => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    getCallsStatusMock.mockResolvedValue({
      chainId: 1,
      receipts: [{ transactionHash: resolvedBatchTxHash }],
      status: 'success',
    });
    const transaction = createMixedLifiTestTransaction('mixed-resolved-batch-route');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }));

    await waitFor(() => {
      const [updatedTransaction] =
        useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS] ?? [];
      expect(updatedTransaction?.txId).toBe(acceptedSourceTxHash);
      expect(updatedTransaction?.lifiRoute?.steps[1]?.execution?.process[0]?.txHash).toBe(
        resolvedBatchTxHash,
      );
    });
  });

  it('resolves every batch id stored on one route', async () => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    getCallsStatusMock.mockImplementation((_config, { id }: { id: string }) =>
      Promise.resolve({
        chainId: 1,
        receipts: [
          {
            transactionHash:
              id === batchId32Bytes ? resolvedBatchTxHash : secondResolvedBatchTxHash,
          },
        ],
        status: 'success',
      }),
    );
    const transaction = createBatchedLifiTestTransaction('two-batch-route');
    transaction.lifiRoute?.steps[0]?.execution?.process.push({
      type: 'SWAP',
      status: 'PENDING',
      txHash: secondBatchId,
      txType: 'batched',
      startedAt: 1,
    });
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }));

    await waitFor(() => {
      const [updatedTransaction] =
        useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS] ?? [];
      expect(updatedTransaction?.txId).toBe(resolvedBatchTxHash);
      expect(updatedTransaction?.lifiRoute?.steps[0]?.execution?.process).toEqual([
        expect.objectContaining({ txHash: resolvedBatchTxHash }),
        expect.objectContaining({ txHash: secondResolvedBatchTxHash }),
      ]);
    });
  });

  it('keeps a wallet batch hidden until its receipt transaction hash is available', async () => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    let batchHasReceipt = false;
    getCallsStatusMock.mockImplementation(() => {
      if (batchHasReceipt) {
        return Promise.resolve({
          chainId: 1,
          receipts: [{ transactionHash: resolvedBatchTxHash }],
          status: 'success',
        });
      }
      return Promise.resolve({ receipts: [], status: 'pending' });
    });
    const transaction = createBatchedLifiTestTransaction('mined-hidden-batch');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    const { result } = renderHook(() =>
      useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }),
    );

    await waitFor(() => expect(getCallsStatusMock).toHaveBeenCalled());
    expect(useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS]).toEqual([
      transaction,
    ]);
    expect(result.current.transactions).not.toContainEqual(transaction);

    batchHasReceipt = true;
    await waitFor(
      () => {
        const [promotedTransaction] =
          useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS] ?? [];
        expect(promotedTransaction?.txId).toBe(resolvedBatchTxHash);
        expect(promotedTransaction?.showInHistory).toBe(true);
        expect(promotedTransaction?.lifiRoute?.steps[0]?.execution?.process[0]).toMatchObject({
          txHash: resolvedBatchTxHash,
          txLink: `https://etherscan.io/tx/${resolvedBatchTxHash}`,
        });
        expect(result.current.transactions).toEqual(
          expect.arrayContaining([expect.objectContaining({ txId: resolvedBatchTxHash })]),
        );
      },
      { timeout: 3_000 },
    );
  });

  it.each([
    ['removes a hidden route after rejection', 'bundle id is unknown', false],
    ['keeps a hidden route after a transient error', 'request timed out', true],
  ])('%s', async (_name, errorMessage, shouldKeepRoute) => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    getCallsStatusMock.mockRejectedValue(new Error(errorMessage));
    const transaction = createBatchedLifiTestTransaction('hidden-batch');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    const { result } = renderHook(() =>
      useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }),
    );

    await waitFor(() => {
      expect(getCallsStatusMock).toHaveBeenCalled();
      expect(
        useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS],
      ).toEqual(shouldKeepRoute ? [transaction] : []);
    });
    expect(result.current.transactions).not.toContainEqual(transaction);
  });

  it('keeps a wallet batch hidden while pending and removes it after rejection', async () => {
    enableTransactionHistory();
    wagmiMocks.connector = {};
    let batchWasRejected = false;
    getCallsStatusMock.mockImplementation(() => {
      if (batchWasRejected) {
        return Promise.reject(new Error('bundle id is unknown'));
      }
      return Promise.resolve({ receipts: [], status: 'pending' });
    });
    const transaction = createBatchedLifiTestTransaction('pending-then-rejected-batch');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    const { result } = renderHook(() =>
      useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }),
    );

    await waitFor(() => expect(getCallsStatusMock).toHaveBeenCalled());
    expect(useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS]).toEqual([
      transaction,
    ]);
    expect(result.current.transactions).not.toContainEqual(transaction);

    batchWasRejected = true;
    await waitFor(
      () => {
        expect(
          useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS],
        ).toEqual([]);
      },
      { timeout: 3_000 },
    );
    expect(result.current.transactions).not.toContainEqual(transaction);
  });

  it('does not reconcile a cached batch while viewing a different wallet', async () => {
    enableTransactionHistory();
    wagmiMocks.address = wallets.WALLET_EMPTY;
    wagmiMocks.connector = {};
    const transaction = createBatchedLifiTestTransaction('another-wallet-batch-route');
    useLifiMergedTransactionCacheStore.setState({
      transactions: { [MERGE_TEST_ADDRESS]: [transaction] },
    });

    renderHook(() => useTransactionHistory(MERGE_TEST_ADDRESS, { runFetcher: true }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(getCallsStatusMock).not.toHaveBeenCalled();
    expect(useLifiMergedTransactionCacheStore.getState().transactions[MERGE_TEST_ADDRESS]).toEqual([
      transaction,
    ]);
  });

  it.each([
    createTestCase({
      key: 'WALLET_MULTIPLE_TX',
      enabled: true,
      expectedPagesTxCounts: [3, 5],
    }),
    createTestCase({
      key: 'WALLET_MULTIPLE_TX',
      enabled: false,
      expectedPagesTxCounts: [0],
    }),
    // skipping it for now because it is not working as expected even going to the UI manually
    // createTestCase({
    //   key: 'WALLET_SINGLE_TX',
    //   enabled: true,
    //   expectedPagesTxCounts: [1]
    // }),
    createTestCase({
      key: 'WALLET_SINGLE_TX',
      enabled: false,
      expectedPagesTxCounts: [0],
    }),
    createTestCase({
      key: 'WALLET_EMPTY',
      enabled: true,
      expectedPagesTxCounts: [0],
    }),
  ])(
    'fetches history for key:$key enabled:$enabled expectedPagesTxCounts:$expectedPagesTxCounts',
    async ({ key, enabled, expectedPagesTxCounts }) => {
      const mockUseArbQueryParams = vi.mocked(useArbQueryParams);
      const [currentParams, setParams] = mockUseArbQueryParams();

      mockUseArbQueryParams.mockReturnValue([
        {
          ...currentParams,
          sourceChain: 11155111,
          disabledFeatures: enabled ? [] : ['tx-history'],
        },
        setParams,
      ]);

      const address = wallets[key];

      if (!address) {
        throw new Error(`Wallet ${key} not found. Make sure it's added to the list of wallets.`);
      }

      const { result } = await renderHookAsyncUseTransactionHistory(address);

      // fetch each batch
      for (let page = 0; page < expectedPagesTxCounts.length; page++) {
        // initial fetch starts immediately
        if (page > 0) {
          act(() => {
            result.current.resume();
          });
        }

        expect(result.current.loading).toBe(true);

        // eslint-disable-next-line no-await-in-loop
        await waitFor(
          () => {
            // fetching finished
            expect(result.current.loading).toBe(false);
          },
          { timeout: 30_000, interval: 500 },
        );

        // total results so far
        expect(result.current.transactions).toHaveLength(Number(expectedPagesTxCounts[page]));
      }

      // finally, no more transactions left to be fetched
      expect(result.current.completed).toBe(true);
    },
  );
});

describe('mergeTransactions', () => {
  it('dedupes a pending session tx once the same tx appears in fetched history', () => {
    const pendingTx: MergedTransaction = {
      ...mergeTestBaseTx,
      createdAt: 1_700_000_000_200,
      txId: '0xabc',
      direction: 'deposit',
      status: 'success',
      isWithdrawal: false,
      depositStatus: DepositStatus.L1_PENDING,
    };

    const fetchedTx: MergedTransaction = {
      ...mergeTestBaseTx,
      createdAt: 1_700_000_000_100,
      txId: '0xabc',
      direction: 'deposit',
      status: 'success',
      isWithdrawal: false,
      depositStatus: DepositStatus.L2_SUCCESS,
    };

    const transactions = mergeTransactions({
      address: MERGE_TEST_ADDRESS,
      newTransactions: [pendingTx],
      fetchedTransactions: [[fetchedTx]],
    });

    expect(transactions).toEqual([fetchedTx]);
  });

  it('keeps batched fetched withdrawals with the same tx id but different unique ids', () => {
    const firstFetchedTx: MergedTransaction = {
      ...mergeTestBaseTx,
      createdAt: 1_700_000_000_300,
      txId: '0xbatched',
      direction: 'withdraw',
      status: WithdrawalStatus.UNCONFIRMED,
      isWithdrawal: true,
      uniqueId: BigNumber.from(1),
    };

    const secondFetchedTx: MergedTransaction = {
      ...mergeTestBaseTx,
      createdAt: 1_700_000_000_200,
      txId: '0xbatched',
      direction: 'withdraw',
      status: WithdrawalStatus.UNCONFIRMED,
      isWithdrawal: true,
      uniqueId: BigNumber.from(2),
    };

    const pendingTx: MergedTransaction = {
      ...mergeTestBaseTx,
      createdAt: 1_700_000_000_400,
      txId: '0xbatched',
      direction: 'withdraw',
      status: WithdrawalStatus.UNCONFIRMED,
      isWithdrawal: true,
      uniqueId: null,
    };

    const transactions = mergeTransactions({
      address: MERGE_TEST_ADDRESS,
      newTransactions: [pendingTx],
      fetchedTransactions: [[firstFetchedTx, secondFetchedTx]],
    });

    expect(transactions).toEqual([firstFetchedTx, secondFetchedTx]);
  });

  it('keeps distinct transactions and sorts them, newest first', () => {
    const olderTx: MergedTransaction = {
      ...mergeTestBaseTx,
      createdAt: 1_700_000_000_000,
      txId: '0xolder',
      direction: 'withdraw',
      status: WithdrawalStatus.UNCONFIRMED,
      isWithdrawal: true,
    };

    const newerTx: MergedTransaction = {
      ...mergeTestBaseTx,
      createdAt: 1_700_000_000_500,
      txId: '0xnewer',
      direction: 'withdraw',
      status: WithdrawalStatus.UNCONFIRMED,
      isWithdrawal: true,
    };

    const transactions = mergeTransactions({
      address: MERGE_TEST_ADDRESS,
      newTransactions: [olderTx],
      fetchedTransactions: [[newerTx]],
    });

    expect(transactions).toEqual([newerTx, olderTx]);
  });

  it('dedupes fetched LiFi rows and keeps cached destination token metadata over pending API unknown metadata', () => {
    const cachedLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      txId: '0xlifi-duplicate',
      durationMs: 12_000,
      parentChainId: 42161,
      childChainId: 1,
      toolsDetails: [{ key: 'glacis', name: 'Glacis', logoURI: 'https://example.com/glacis.png' }],
      fromAmount: {
        ...lifiTestBaseTx.fromAmount!,
        token: {
          ...lifiTestBaseTx.fromAmount!.token,
          logoURI: 'https://example.com/source-token.png',
        },
      },
      toAmount: {
        amount: '99',
        amountUSD: '9',
        token: {
          address: '0x2222222222222222222222222222222222222222',
          decimals: 18,
          logoURI: 'https://example.com/token.png',
          symbol: 'APE',
        },
      },
    };
    const pendingApiLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      txId: '0xlifi-duplicate',
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      durationMs: 0,
      toolsDetails: [{ key: 'glacis', name: 'glacis', logoURI: '' }],
      fromAmount: {
        ...lifiTestBaseTx.fromAmount!,
        amount: '2',
        amountUSD: '2',
        token: {
          ...lifiTestBaseTx.fromAmount!.token,
          logoURI: '',
        },
      },
      toAmount: unknownLifiDestinationAmount,
    };

    const transactions = mergeTransactions({
      address: MERGE_TEST_ADDRESS,
      fetchedTransactions: [[cachedLifiTx, pendingApiLifiTx]],
    });

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      txId: '0xlifi-duplicate',
      parentChainId: 1,
      childChainId: 42161,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      durationMs: 0,
      toolsDetails: [
        {
          ...pendingApiLifiTx.toolsDetails?.[0],
          logoURI: cachedLifiTx.toolsDetails?.[0]?.logoURI,
        },
      ],
      fromAmount: {
        ...pendingApiLifiTx.fromAmount,
        token: cachedLifiTx.fromAmount!.token,
      },
      toAmount: cachedLifiTx.toAmount,
    });
  });

  it('falls back to the cached LiFi duration when the API duration is invalid', () => {
    const cachedLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      txId: '0xlifi-invalid-duration',
      durationMs: 12_000,
    };
    const apiLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      txId: '0xlifi-invalid-duration',
      durationMs: Number.NaN,
    };

    const transactions = mergeTransactions({
      address: MERGE_TEST_ADDRESS,
      fetchedTransactions: [[cachedLifiTx, apiLifiTx]],
    });

    expect(transactions[0]).toMatchObject({ durationMs: 12_000 });
  });
});

describe('getDedupedTransactionsForPagination', () => {
  it.each(['FAILED', 'PENDING', 'DONE'] as const)(
    'Uses the destination token over the intermediate token',
    (swapStatus) => {
      const sourceToken = {
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        logoURI: '',
        symbol: 'ETH',
        chainId: 1,
        name: 'Ether',
        priceUSD: '2000',
      };
      const intermediateToken = { ...sourceToken, chainId: 42161 };
      const finalToken = {
        ...intermediateToken,
        address: '0x2222222222222222222222222222222222222222',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        logoURI: 'https://example.com/usdc.png',
        priceUSD: '1',
      };
      const step: RouteExtended['steps'][number] = {
        id: 'bridge',
        type: 'lifi',
        tool: 'across',
        toolDetails: { key: 'across', name: 'Across', logoURI: '' },
        includedSteps: [],
        action: {
          fromChainId: 1,
          fromAmount: '1000000000000000000',
          fromToken: sourceToken,
          toChainId: 42161,
          toToken: intermediateToken,
        },
        estimate: {
          tool: 'across',
          fromAmount: '1000000000000000000',
          toAmount: '990000000000000000',
          toAmountMin: '980000000000000000',
          approvalAddress: sourceToken.address,
          executionDuration: 60,
        },
        execution: { status: 'DONE', process: [], startedAt: 1_700_000_000_000 },
      };
      const lifiRoute: RouteExtended = {
        id: 'multistep-route',
        insurance: { state: 'NOT_INSURABLE', feeAmountUsd: '0' },
        fromChainId: 1,
        fromAmount: step.action.fromAmount,
        fromAmountUSD: '2000',
        fromToken: sourceToken,
        toChainId: 42161,
        toAmount: '1900000000',
        toAmountMin: '1800000000',
        toAmountUSD: '1900',
        toToken: finalToken,
        steps: [
          step,
          {
            ...step,
            id: 'swap',
            action: {
              ...step.action,
              fromChainId: 42161,
              fromToken: intermediateToken,
              toToken: finalToken,
            },
            estimate: { ...step.estimate, toAmount: '1900000000', toAmountUSD: '1900' },
            execution: {
              status: swapStatus,
              process: [],
              startedAt: 1_700_000_060_000,
              toAmount: swapStatus === 'DONE' ? '1890000000' : '990000000000000000',
              toToken:
                swapStatus === 'DONE'
                  ? { ...finalToken, symbol: 'EXEC', name: 'Execution token', logoURI: '' }
                  : intermediateToken,
            },
          },
        ],
      };
      const transactions = getDedupedTransactionsForPagination({
        fetchedTransactions: [
          {
            ...lifiTestBaseTx,
            toAmount: {
              amount: '990000000000000000',
              amountUSD: '1980',
              token: intermediateToken,
            },
          },
        ],
        cachedDeposits: [],
        cachedLifiTransactions: [{ ...lifiTestBaseTx, lifiRoute }],
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({
        toAmount: {
          amount: swapStatus === 'DONE' ? '1890000000' : '1900000000',
          token: finalToken,
        },
      });
    },
  );

  it('dedupes local LiFi cache when API history returns the same transaction', () => {
    const cachedRoute = {
      id: 'cached-route',
      steps: [{}, {}],
    } as unknown as LifiMergedTransaction['lifiRoute'];
    const cachedLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      status: WithdrawalStatus.UNCONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: cachedRoute,
    };
    const apiLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      destinationTxId: '0xdestination',
    };

    const transactions = getDedupedTransactionsForPagination({
      fetchedTransactions: [apiLifiTx],
      cachedDeposits: [],
      cachedLifiTransactions: [cachedLifiTx],
    });

    expect(transactions).toEqual([
      {
        ...apiLifiTx,
        lifiRoute: cachedRoute,
      },
    ]);
  });

  it('keeps a resumable cached LiFi route pending when API history reports its first step as done', () => {
    const cachedRoute = {
      id: 'cached-multi-step-route',
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
    const cachedLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      status: WithdrawalStatus.UNCONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      createdAt: Date.now(),
      lifiRoute: cachedRoute,
    };
    const apiLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.CONFIRMED,
      createdAt: Date.now(),
    };

    const [transaction] = getDedupedTransactionsForPagination({
      fetchedTransactions: [apiLifiTx],
      cachedDeposits: [],
      cachedLifiTransactions: [cachedLifiTx],
    });

    expect(transaction).toMatchObject({
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      lifiRoute: cachedRoute,
    });
  });

  it('dedupes local LiFi cache with pending API history that has unknown destination token metadata', () => {
    const cachedLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      txId: '0xlifi-pending-unknown',
      parentChainId: 42161,
      childChainId: 1,
      toolsDetails: [{ key: 'glacis', name: 'Glacis', logoURI: 'https://example.com/glacis.png' }],
      fromAmount: {
        ...lifiTestBaseTx.fromAmount!,
        token: {
          ...lifiTestBaseTx.fromAmount!.token,
          logoURI: 'https://example.com/source-token.png',
        },
      },
      toAmount: {
        amount: '99',
        amountUSD: '9',
        token: {
          address: '0x2222222222222222222222222222222222222222',
          decimals: 18,
          logoURI: 'https://example.com/token.png',
          symbol: 'APE',
        },
      },
    };
    const pendingApiLifiTx: LifiMergedTransaction = {
      ...lifiTestBaseTx,
      txId: '0xlifi-pending-unknown',
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      toolsDetails: [{ key: 'glacis', name: 'glacis', logoURI: '' }],
      fromAmount: {
        ...lifiTestBaseTx.fromAmount!,
        amount: '2',
        amountUSD: '2',
        token: {
          ...lifiTestBaseTx.fromAmount!.token,
          logoURI: '',
        },
      },
      toAmount: unknownLifiDestinationAmount,
    };

    const transactions = getDedupedTransactionsForPagination({
      fetchedTransactions: [pendingApiLifiTx],
      cachedDeposits: [],
      cachedLifiTransactions: [cachedLifiTx],
    });

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      txId: '0xlifi-pending-unknown',
      parentChainId: 1,
      childChainId: 42161,
      status: WithdrawalStatus.CONFIRMED,
      destinationStatus: WithdrawalStatus.UNCONFIRMED,
      toolsDetails: [
        {
          ...pendingApiLifiTx.toolsDetails?.[0],
          logoURI: cachedLifiTx.toolsDetails?.[0]?.logoURI,
        },
      ],
      fromAmount: {
        ...pendingApiLifiTx.fromAmount,
        token: cachedLifiTx.fromAmount!.token,
      },
      toAmount: cachedLifiTx.toAmount,
    });
  });
});

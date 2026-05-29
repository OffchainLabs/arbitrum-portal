import { act, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { Address } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DepositStatus, MergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { AssetType } from '../arbTokenBridge.types';
import { useArbQueryParams } from '../useArbQueryParams';
import { mergeTransactions, useTransactionHistory } from '../useTransactionHistory';

const wallets = {
  WALLET_MULTIPLE_TX: '0x1798440327d78ebb19db0c8999e2368eaed8f413',
  WALLET_SINGLE_TX: '0x6d051646D4A9df8679E9AD3429e70415f75f6499',
  WALLET_EMPTY: '0xa5801D65537dF15e90D284E5E917AE84e3F3201c',
} as const;

const MERGE_TEST_ADDRESS = '0x1111111111111111111111111111111111111111';

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
  useAccount: () => ({
    isConnected: true,
    chain: { id: 11155111 },
    connector: null,
  }),
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

describe.sequential('useTransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

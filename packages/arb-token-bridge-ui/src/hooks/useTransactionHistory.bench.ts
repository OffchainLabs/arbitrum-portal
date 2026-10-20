import { chunk } from 'lodash-es';
import { bench, describe } from 'vitest';

import { MergedTransaction } from '../state/app/state';
import { createMockLifiTransaction } from '../test-utils/lifi';
import { ChainId } from '../types/ChainId';
import { Transaction } from '../types/Transactions';
import { WithdrawalFromSubgraph } from '../util/withdrawals/fetchWithdrawalsFromSubgraph';
import { AssetType } from './arbTokenBridge.types';
import {
  Transfer,
  getDedupedTransactionsForPagination,
  mergeTransactions,
} from './useTransactionHistory';

const address = '0x1111111111111111111111111111111111111111';
// Deterministic, so every run measures the same input
const startTimestamp = 1_700_000_000;

function getTxHash(index: number) {
  return `0x${index.toString(16).padStart(64, '0')}`;
}

function getDeposit(index: number, source: Transaction['source'] = 'subgraph'): Transaction {
  return {
    type: 'deposit-l1',
    status: 'success',
    direction: 'deposit',
    source,
    value: '1.5',
    txID: getTxHash(index),
    assetName: 'ETH',
    assetType: AssetType.ETH,
    sender: address,
    destination: address,
    l1NetworkID: String(ChainId.Ethereum),
    l2NetworkID: String(ChainId.ArbitrumOne),
    parentChainId: ChainId.Ethereum,
    childChainId: ChainId.ArbitrumOne,
    timestampCreated: String(startTimestamp + index * 60),
  };
}

function getWithdrawal(index: number): WithdrawalFromSubgraph {
  return {
    id: `withdrawal-${index}`,
    type: 'EthWithdrawal',
    sender: address,
    receiver: address,
    ethValue: '1500000000000000000',
    tokenAmount: '0',
    isClassic: false,
    l2BlockTimestamp: String(startTimestamp + index * 60),
    l2TxHash: getTxHash(index),
    l2BlockNum: String(200_000_000 + index),
    direction: 'withdrawal',
    source: 'subgraph',
    parentChainId: ChainId.Ethereum,
    childChainId: ChainId.ArbitrumOne,
  };
}

function getLifiTransaction(index: number) {
  return createMockLifiTransaction({
    txId: getTxHash(index),
    createdAt: (startTimestamp + index * 60) * 1_000,
  });
}

function getMergedTransaction(index: number): MergedTransaction {
  const isWithdrawal = index % 3 === 0;
  return {
    sender: address,
    destination: address,
    direction: isWithdrawal ? 'withdraw' : 'deposit-l1',
    status: 'success',
    createdAt: (startTimestamp + index * 60) * 1_000,
    resolvedAt: null,
    txId: getTxHash(index),
    asset: 'ETH',
    assetType: AssetType.ETH,
    value: '1.5',
    uniqueId: null,
    isWithdrawal,
    blockNum: null,
    tokenAddress: null,
    parentChainId: ChainId.Ethereum,
    childChainId: ChainId.ArbitrumOne,
    sourceChainId: isWithdrawal ? ChainId.ArbitrumOne : ChainId.Ethereum,
    destinationChainId: isWithdrawal ? ChainId.Ethereum : ChainId.ArbitrumOne,
  };
}

function getRange(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => start + index);
}

// A wallet with a long history: deposits and withdrawals from the subgraph, deposits cached in
// local storage (half of them also fetched), and LiFi transfers from the cache
const fetchedTransactions: Transfer[] = getRange(0, 1_000).map((index) =>
  index % 3 === 0 ? getWithdrawal(index) : getDeposit(index),
);
const cachedDeposits: Transfer[] = getRange(950, 100).map((index) =>
  getDeposit(index, 'local_storage_cache'),
);
const cachedLifiTransactions: Transfer[] = getRange(2_000, 50).map(getLifiTransaction);

// The hook transforms transactions in pages of 3 and merges them with those sent in this session
const fetchedPages = chunk(getRange(0, 1_000).map(getMergedTransaction), 3);
const newTransactions = [
  ...getRange(990, 10).map(getMergedTransaction),
  ...getRange(3_000, 10).map(getMergedTransaction),
];

describe('transaction history', () => {
  bench(
    `getDedupedTransactionsForPagination, ${fetchedTransactions.length} fetched, ${cachedDeposits.length} cached deposits, ${cachedLifiTransactions.length} LiFi`,
    () => {
      getDedupedTransactionsForPagination({
        fetchedTransactions,
        cachedDeposits,
        cachedLifiTransactions,
      });
    },
  );

  bench(
    `mergeTransactions, ${fetchedPages.length} pages, ${newTransactions.length} new transactions`,
    () => {
      mergeTransactions({ address, newTransactions, fetchedTransactions: fetchedPages });
    },
  );
});

import { BigNumber } from '@ethersproject/bignumber';
import { useDebounce } from '@uidotdev/usehooks';
import dayjs from 'dayjs';
import pLimit from 'p-limit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import useSWRInfinite from 'swr/infinite';
import { useAccount } from 'wagmi';
import { create } from 'zustand';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import {
  getDepositsWithoutStatusesFromCache,
  getUpdatedCctpTransfer,
  getUpdatedEthDeposit,
  getUpdatedLifiTransfer,
  getUpdatedRetryableDeposit,
  getUpdatedWithdrawal,
  isCctpTransfer,
  isLifiTransfer,
  isOftTransfer,
  isSameTransaction,
  isTxPending,
} from '../components/TransactionHistory/helpers';
import { useSelectedChainIds } from '../components/TransactionHistory/useTransactionHistoryChainFilter';
import { LifiMergedTransaction, MergedTransaction } from '../state/app/state';
import { transformDeposit, transformWithdrawal } from '../state/app/utils';
import { useCctpFetching } from '../state/cctpState';
import { ChainId } from '../types/ChainId';
import { Transaction } from '../types/Transactions';
import { Address, addressesEqual, findFirstBlockWithNonce, getNonce } from '../util/AddressUtils';
import { backOff } from '../util/ExponentialBackoffUtils';
import { captureSentryErrorWithExtraData } from '../util/SentryUtils';
import { shouldIncludeReceivedTxs, shouldIncludeSentTxs } from '../util/SubgraphUtils';
import { matchesChainFilter } from '../util/chainFilter';
import { fetchDeposits } from '../util/deposits/fetchDeposits';
import { updateAdditionalDepositData } from '../util/deposits/helpers';
import { getNetworksRelationship } from '../util/getNetworksRelationship';
import { logger } from '../util/logger';
import { isNetwork } from '../util/networks';
import { normalizeTimestamp } from '../util/normalizeTimestamp';
import { ChainPair, getMultiChainFetchList } from '../util/txHistoryRoutes';
import { FetchWithdrawalsParams, fetchWithdrawals } from '../util/withdrawals/fetchWithdrawals';
import { WithdrawalFromSubgraph } from '../util/withdrawals/fetchWithdrawalsFromSubgraph';
import {
  EthWithdrawal,
  isTokenWithdrawal,
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalFromSubgraphToL2ToL1EventResult,
} from '../util/withdrawals/helpers';
import { AssetType, L2ToL1EventResultPlus, WithdrawalInitiated } from './arbTokenBridge.types';
import { canFetchTransactionHistory } from './canFetchTransactionHistory';
import { useAccountType } from './useAccountType';
import { DisabledFeatures } from './useArbQueryParams';
import { useDisabledFeatures } from './useDisabledFeatures';
import { useIsTestnetMode } from './useIsTestnetMode';
import { useLifiMergedTransactionCacheStore } from './useLifiMergedTransactionCacheStore';
import { useLifiTransactionHistory } from './useLifiTransactionHistory';
import {
  getUpdatedOftTransfer,
  updateAdditionalLayerZeroData,
  useOftTransactionHistory,
} from './useOftTransactionHistory';

const BATCH_FETCH_BLOCKS: { [key: number]: number } = {
  33139: 5_000_000, // ApeChain
  1628: 10_000, // T-REX
  869: 10_000, // World Mobile Chain
  680: 10_000, // JASMY Chain
  20010: 10_000, // Mandala Chain
  704851: 10_000, // Mars Chain
  1962: 10_000, // T-Rex Testnet
  681: 10_000, // JASMY Chain Testnet
  20011: 10_000, // Mandala Chain Testnet
  704852: 10_000, // Mars Chain Testnet
};

export type UseTransactionHistoryResult = {
  transactions: MergedTransaction[];
  loading: boolean;
  completed: boolean;
  error: unknown;
  failedChainPairs: ChainPair[];
  pause: () => void;
  resume: () => void;
  addPendingTransaction: (tx: MergedTransaction) => void;
  updatePendingTransaction: (tx: MergedTransaction) => Promise<void>;
};

export type Deposit = Transaction;

export type Withdrawal = WithdrawalFromSubgraph | WithdrawalInitiated | EthWithdrawal;

type DepositOrWithdrawal = Deposit | Withdrawal;
export type Transfer = DepositOrWithdrawal | MergedTransaction;

type ForceFetchReceivedStore = {
  forceFetchReceived: boolean;
  setForceFetchReceived: (forceFetchReceived: boolean) => void;
};

export const useForceFetchReceived = create<ForceFetchReceivedStore>((set) => ({
  forceFetchReceived: false,
  setForceFetchReceived: (forceFetchReceived) => set({ forceFetchReceived }),
}));

function getTransactionTimestamp(tx: Transfer) {
  if (isLifiTransfer(tx)) {
    return normalizeTimestamp(tx.createdAt ?? 0);
  }

  if (isCctpTransfer(tx)) {
    return normalizeTimestamp(tx.createdAt ?? 0);
  }

  if (isOftTransfer(tx)) {
    return normalizeTimestamp(tx.createdAt ?? 0);
  }

  if (isDeposit(tx)) {
    return normalizeTimestamp(tx.timestampCreated ?? 0);
  }

  if (isWithdrawalFromSubgraph(tx)) {
    return normalizeTimestamp(tx.l2BlockTimestamp);
  }

  return normalizeTimestamp(tx.timestamp?.toNumber() ?? 0);
}

function sortByTimestampDescending(a: Transfer, b: Transfer) {
  return getTransactionTimestamp(b) - getTransactionTimestamp(a);
}

function makeMatchesSelectedChains(selectedChainIds: number[]) {
  return (tx: MergedTransaction) =>
    matchesChainFilter({
      selectedChainIds,
      sourceChainId: tx.sourceChainId,
      destinationChainId: tx.destinationChainId,
    });
}

function isWithdrawalFromSubgraph(tx: Withdrawal): tx is WithdrawalFromSubgraph {
  return tx.source === 'subgraph';
}

function isDeposit(tx: DepositOrWithdrawal): tx is Deposit {
  return tx.direction === 'deposit';
}

async function transformTransaction(tx: Transfer): Promise<MergedTransaction> {
  // LifiTransaction are already MergedTransaction
  if (isLifiTransfer(tx)) {
    return tx;
  }

  const parentProvider = getProviderForChainId(tx.parentChainId);
  const childProvider = getProviderForChainId(tx.childChainId);

  if (isCctpTransfer(tx)) {
    return tx;
  }

  if (isOftTransfer(tx)) {
    return await updateAdditionalLayerZeroData(tx);
  }

  if (isDeposit(tx)) {
    return transformDeposit(await updateAdditionalDepositData(tx));
  }

  let withdrawal: L2ToL1EventResultPlus | undefined;

  if (isWithdrawalFromSubgraph(tx)) {
    withdrawal = await mapWithdrawalFromSubgraphToL2ToL1EventResult({
      withdrawal: tx,
      l1Provider: parentProvider,
      l2Provider: childProvider,
    });
  } else {
    if (isTokenWithdrawal(tx)) {
      withdrawal = await mapTokenWithdrawalFromEventLogsToL2ToL1EventResult({
        result: tx,
        l1Provider: parentProvider,
        l2Provider: childProvider,
      });
    } else {
      withdrawal = await mapETHWithdrawalToL2ToL1EventResult({
        event: tx,
        l1Provider: parentProvider,
        l2Provider: childProvider,
      });
    }
  }

  if (withdrawal) {
    return transformWithdrawal(withdrawal);
  }

  // Throw user friendly error in case we catch it and display in the UI.
  throw new Error(
    'An error has occurred while fetching a transaction. Please try again later or contact the support.',
  );
}

function getTxIdFromTransaction(tx: Transfer) {
  if (isCctpTransfer(tx) || isOftTransfer(tx) || isLifiTransfer(tx)) {
    return tx.txId;
  }
  if (isDeposit(tx)) {
    return tx.txID;
  }
  if (isWithdrawalFromSubgraph(tx)) {
    return tx.l2TxHash;
  }
  if (isTokenWithdrawal(tx)) {
    return tx.txHash;
  }
  return tx.l2TxHash ?? tx.transactionHash;
}

function getCacheKeyFromTransaction(tx: Transfer) {
  const txId = getTxIdFromTransaction(tx);
  if (!txId) {
    return undefined;
  }

  if (isLifiTransfer(tx)) {
    return `lifi-${tx.sourceChainId}-${tx.destinationChainId}-${txId.toLowerCase()}`;
  }

  const base = `${tx.parentChainId}-${txId.toLowerCase()}`;

  // For token withdrawals from event logs, include _l2ToL1Id to preserve batch events
  if ('_l2ToL1Id' in tx && tx._l2ToL1Id) {
    return `${base}-${(tx._l2ToL1Id as BigNumber).toString()}`;
  }
  // For ETH withdrawals from event logs, include position
  if ('position' in tx && (tx as { position: BigNumber }).position) {
    return `${base}-${(tx as { position: BigNumber }).position.toString()}`;
  }
  // For subgraph withdrawals, include the entity id (unique per event)
  if ('source' in tx && tx.source === 'subgraph' && 'id' in tx) {
    return `${base}-${(tx as WithdrawalFromSubgraph).id}`;
  }
  return base;
}

const UNKNOWN_LIFI_TOKEN_SYMBOL = 'Unknown';

function mergeLifiTransaction({
  apiTx,
  localTx,
}: {
  apiTx: LifiMergedTransaction;
  localTx: LifiMergedTransaction;
}): LifiMergedTransaction {
  const { parentChainId, childChainId, isDepositMode } = getNetworksRelationship({
    sourceChainId: apiTx.sourceChainId,
    destinationChainId: apiTx.destinationChainId,
  });
  const apiFromToken =
    apiTx.fromAmount.token.symbol === UNKNOWN_LIFI_TOKEN_SYMBOL
      ? undefined
      : apiTx.fromAmount.token;
  const apiToToken =
    apiTx.toAmount.token.symbol === UNKNOWN_LIFI_TOKEN_SYMBOL ? undefined : apiTx.toAmount.token;
  const apiToAmount = apiToToken ? apiTx.toAmount : undefined;

  return {
    ...localTx,
    ...apiTx,
    parentChainId,
    childChainId,
    direction: isDepositMode ? 'deposit' : 'withdraw',
    isWithdrawal: !isDepositMode,
    resolvedAt: apiTx.resolvedAt ?? localTx.resolvedAt,
    destinationTxId: apiTx.destinationTxId ?? localTx.destinationTxId,
    durationMs: apiTx.durationMs || localTx.durationMs,
    fromAmount: {
      amount: apiTx.fromAmount.amount || localTx.fromAmount.amount,
      amountUSD: apiTx.fromAmount.amountUSD || localTx.fromAmount.amountUSD || '0',
      token: {
        address: apiFromToken?.address || localTx.fromAmount.token.address || '',
        decimals: apiFromToken?.decimals || localTx.fromAmount.token.decimals || 0,
        logoURI: apiFromToken?.logoURI || localTx.fromAmount.token.logoURI || '',
        symbol:
          apiFromToken?.symbol || localTx.fromAmount.token.symbol || UNKNOWN_LIFI_TOKEN_SYMBOL,
      },
    },
    toAmount: {
      amount: apiToAmount?.amount || localTx.toAmount.amount,
      amountUSD: apiToAmount?.amountUSD || localTx.toAmount.amountUSD || '0',
      token: {
        address: apiToToken?.address || localTx.toAmount.token.address || '',
        decimals: apiToToken?.decimals || localTx.toAmount.token.decimals || 0,
        logoURI: apiToToken?.logoURI || localTx.toAmount.token.logoURI || '',
        symbol: apiToToken?.symbol || localTx.toAmount.token.symbol || UNKNOWN_LIFI_TOKEN_SYMBOL,
      },
    },
    toolDetails: {
      key: apiTx.toolDetails.key || localTx.toolDetails.key || '',
      name: apiTx.toolDetails.name || localTx.toolDetails.name || '',
      logoURI: apiTx.toolDetails.logoURI || localTx.toolDetails.logoURI || '',
    },
    transactionRequest: apiTx.transactionRequest ?? localTx.transactionRequest,
  };
}

// remove the duplicates from the transactions passed
function dedupeTransactions(txs: Transfer[]) {
  const transactionsByCacheKey = new Map<string | undefined, Transfer>();

  for (const tx of txs) {
    const cacheKey = getCacheKeyFromTransaction(tx);
    const existingTx = transactionsByCacheKey.get(cacheKey);

    if (existingTx && isLifiTransfer(existingTx) && isLifiTransfer(tx)) {
      transactionsByCacheKey.set(
        cacheKey,
        mergeLifiTransaction({ localTx: existingTx, apiTx: tx }),
      );
      continue;
    }

    transactionsByCacheKey.set(cacheKey, tx);
  }

  return Array.from(transactionsByCacheKey.values());
}

export function getDedupedTransactionsForPagination({
  fetchedTransactions,
  cachedDeposits,
  cachedLifiTransactions,
}: {
  fetchedTransactions: Transfer[];
  cachedDeposits: Transfer[];
  cachedLifiTransactions: Transfer[];
}) {
  return dedupeTransactions([
    ...cachedLifiTransactions,
    ...fetchedTransactions,
    ...cachedDeposits,
  ]).sort(sortByTimestampDescending);
}

function getMergedTransactionIdentity(tx: MergedTransaction) {
  const normalizedTxId = tx.txId?.toLowerCase();

  if (isLifiTransfer(tx)) {
    return `lifi-${tx.sourceChainId}-${tx.destinationChainId}-${normalizedTxId}`;
  }

  return `${tx.parentChainId}-${tx.childChainId}-${normalizedTxId}`;
}

function isTransactionForAddress(tx: MergedTransaction, address?: Address) {
  // make sure txs are for the current account, we can have a mismatch when switching accounts for a bit
  const normalizedAddress = address?.toLowerCase();
  return [tx.sender?.toLowerCase(), tx.destination?.toLowerCase()].includes(normalizedAddress);
}

export function mergeTransactions({
  address,
  newTransactions = [],
  fetchedTransactions = [],
}: {
  address?: Address;
  newTransactions?: MergedTransaction[];
  fetchedTransactions?: MergedTransaction[][];
}) {
  const flattenedFetchedTransactions = fetchedTransactions.flat();
  const fetchedByIdentity = new Map<string, MergedTransaction[]>();

  for (const tx of flattenedFetchedTransactions) {
    if (!isTransactionForAddress(tx, address)) {
      continue;
    }

    const identity = getMergedTransactionIdentity(tx);
    const existingTransactions = fetchedByIdentity.get(identity) ?? [];

    if (isLifiTransfer(tx)) {
      const [existingTx] = existingTransactions;
      fetchedByIdentity.set(
        identity,
        existingTx && isLifiTransfer(existingTx)
          ? [mergeLifiTransaction({ localTx: existingTx, apiTx: tx })]
          : [tx],
      );
      continue;
    }

    fetchedByIdentity.set(identity, [...existingTransactions, tx]);
  }

  const pendingOnlyTransactions = newTransactions.filter((tx) => {
    if (!isTransactionForAddress(tx, address)) {
      return false;
    }

    const fetchedTransactionsWithSameIdentity =
      fetchedByIdentity.get(getMergedTransactionIdentity(tx)) ?? [];
    const [fetchedTx] = fetchedTransactionsWithSameIdentity;

    if (isLifiTransfer(tx) && fetchedTx && isLifiTransfer(fetchedTx)) {
      fetchedByIdentity.set(getMergedTransactionIdentity(tx), [
        mergeLifiTransaction({ localTx: tx, apiTx: fetchedTx }),
      ]);
      return false;
    }

    return !fetchedTransactionsWithSameIdentity.some((fetchedTx) => {
      if (isLifiTransfer(fetchedTx) && isLifiTransfer(tx)) {
        return getMergedTransactionIdentity(fetchedTx) === getMergedTransactionIdentity(tx);
      }

      return isSameTransaction(
        { ...fetchedTx, txId: fetchedTx.txId.toLowerCase() },
        { ...tx, txId: tx.txId.toLowerCase() },
      );
    });
  });

  return [...Array.from(fetchedByIdentity.values()).flat(), ...pendingOnlyTransactions].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
  );
}

export async function fetchWithdrawalsInBatches(
  params: FetchWithdrawalsParams & {
    batchSizeBlocks?: number;
  },
): Promise<Withdrawal[]> {
  const latestBlockNumber = await params.l2Provider.getBlockNumber();

  let fromBlock = params.fromBlock ?? 1;
  const toBlock = params.toBlock ?? latestBlockNumber;

  if (toBlock < fromBlock) {
    throw new Error(`toBlock (${toBlock}) cannot be lower than fromBlock (${fromBlock})`);
  }

  const childChainId = (await params.l2Provider.getNetwork()).chainId;
  const { isOrbitChain } = isNetwork(childChainId);

  // Note: same logic present inside `fetchWithdrawals` function, but this gates
  // even earlier, before the batches are sliced.
  //
  // Zero sender nonce on an Orbit chain means the address has no L3 activity,
  // so it can't have initiated any withdrawals. Escape before slicing into batches
  // to avoid firing the per-batch nonce/subgraph/block-number calls hundreds of
  // times. `forceFetchReceived` opts out (e.g., SCWs).
  if (isOrbitChain && params.sender && !params.forceFetchReceived) {
    const senderNonce = await backOff(() =>
      getNonce(params.sender, { provider: params.l2Provider }),
    );
    if (senderNonce === 0) {
      return [];
    }

    // For self-withdrawals on Orbit chains (sender == receiver), the user
    // can't have any withdrawals before their first L2 tx. Binary-search
    // for that block (~log2(latestBlock) RPCs) and use it as the lower bound
    // to skip empty pre-history.
    //
    // Only do this when BATCH_FETCH_BLOCKS is small. On chains like ApeChain
    // (5M batch size, ~8 total batches), the ~25 sequential probe calls cost
    // more than they save. On Mind/T-REX (10k batch size, hundreds/thousands
    // of batches), the savings dominate.
    const SMALL_BATCH_SIZE_THRESHOLD = 100_000;
    const batchSizeIsSmall =
      typeof params.batchSizeBlocks === 'number' &&
      params.batchSizeBlocks <= SMALL_BATCH_SIZE_THRESHOLD;

    // Apply when there are no separate receiver queries to worry about:
    // either receiver is undefined (e.g., SCW connected to child chain — only
    // sent txns are fetched), or receiver == sender (EOA self-withdrawal).
    if (batchSizeIsSmall && (!params.receiver || addressesEqual(params.sender, params.receiver))) {
      const firstBlock = await findFirstBlockWithNonce({
        address: params.sender,
        provider: params.l2Provider,
        latestBlock: latestBlockNumber,
      });
      if (firstBlock > fromBlock) {
        fromBlock = Math.max(0, firstBlock - 1);
      }
    }
  }

  const batchSizeBlocks = params.batchSizeBlocks ?? 5_000_000;
  const batchCount = Math.ceil((toBlock - fromBlock) / batchSizeBlocks);

  // Max parallel fetches to avoid 429 errors
  const limit = pLimit(10);

  const promises = Array.from({ length: batchCount }, (_, i) => {
    // Math.min makes sure we don't fetch above toBlock
    const fromBlockForBatch = Math.min(fromBlock + i * batchSizeBlocks, toBlock);
    const toBlockForBatch = Math.min(fromBlockForBatch + batchSizeBlocks, toBlock);

    return limit(async () => {
      performance.mark(`withdrawal batch start chainId:${childChainId} ${i}/${batchCount}`);
      const result = await fetchWithdrawals({
        ...params,
        fromBlock: fromBlockForBatch,
        toBlock: toBlockForBatch,
      });
      performance.mark(`withdrawal batch end chainId:${childChainId} ${i}/${batchCount}`);
      return result;
    });
  });

  const results = await Promise.all(promises);

  return results.flat();
}

// SWR cache for pending transactions initiated in the current session.
// Does not fetch; only reads/writes the `new_tx_list` cache. Use this instead
// of `useTransactionHistory` when a component only needs to add a pending tx.
export const useAddPendingTransactions = (address: Address | undefined) => {
  const { data: newTransactionsData, mutate: mutateNewTransactionsData } = useSWRImmutable<
    MergedTransaction[]
  >(address ? ['new_tx_list', address] : null);

  const addPendingTransaction = useCallback(
    (tx: MergedTransaction) => {
      if (!isTxPending(tx)) {
        return;
      }

      mutateNewTransactionsData((currentNewTransactions) => {
        if (!currentNewTransactions) {
          return [tx];
        }

        return [tx, ...currentNewTransactions];
      });
    },
    [mutateNewTransactionsData],
  );

  return {
    newTransactionsData,
    mutateNewTransactionsData,
    addPendingTransaction,
  };
};

/**
 * Fetches transaction history only for deposits and withdrawals, without their statuses.
 */
const useTransactionHistoryWithoutStatuses = (address: Address | undefined) => {
  const { chain } = useAccount();
  const [isTestnetMode] = useIsTestnetMode();
  const { accountType, isLoading: isLoadingAccountType } = useAccountType(address);
  const isSmartContractWallet = accountType === 'smart-contract-wallet';
  const { isFeatureDisabled } = useDisabledFeatures();
  const isTxHistoryEnabled = !isFeatureDisabled(DisabledFeatures.TX_HISTORY);

  const forceFetchReceived = useForceFetchReceived((state) => state.forceFetchReceived);

  // Debounced so rapidly toggling several chains coalesces into a single refetch.
  const selectedChainIds = useDebounce(useSelectedChainIds(), 500);
  // Stable identifier for the selected chains so SWR refetches when the filter changes.
  const selectedChainIdsKey = [...selectedChainIds].sort((a, b) => a - b).join(',');

  const cctpTransfersMainnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Ethereum,
    l2ChainId: ChainId.ArbitrumOne,
    pageNumber: 0,
    pageSize: isTxHistoryEnabled ? 1000 : 0,
    type: 'all',
  });

  const cctpTransfersTestnet = useCctpFetching({
    walletAddress: address,
    l1ChainId: ChainId.Sepolia,
    l2ChainId: ChainId.ArbitrumSepolia,
    pageNumber: 0,
    pageSize: isTxHistoryEnabled ? 1000 : 0,
    type: 'all',
  });

  const combinedCctpMainnetTransfers = [
    ...(cctpTransfersMainnet.deposits?.completed || []),
    ...(cctpTransfersMainnet.withdrawals?.completed || []),
    ...(cctpTransfersMainnet.deposits?.pending || []),
    ...(cctpTransfersMainnet.withdrawals?.pending || []),
  ];

  const combinedCctpTestnetTransfers = [
    ...(cctpTransfersTestnet.deposits?.completed || []),
    ...(cctpTransfersTestnet.withdrawals?.completed || []),
    ...(cctpTransfersTestnet.deposits?.pending || []),
    ...(cctpTransfersTestnet.withdrawals?.pending || []),
  ];

  const cctpLoading =
    cctpTransfersMainnet.isLoadingDeposits ||
    cctpTransfersMainnet.isLoadingWithdrawals ||
    cctpTransfersTestnet.isLoadingDeposits ||
    cctpTransfersTestnet.isLoadingWithdrawals;

  const { transactions: oftTransfers, isLoading: oftLoading } = useOftTransactionHistory({
    walletAddress: isTxHistoryEnabled ? address : undefined,
    isTestnet: isTestnetMode,
  });
  const { data: lifiHistoryTransfers, isLoading: lifiHistoryLoading } = useLifiTransactionHistory({
    walletAddress:
      isTxHistoryEnabled && !isSmartContractWallet && !isTestnetMode ? address : undefined,
  });

  const { data: failedChainPairs, mutate: addFailedChainPair } = useSWRImmutable<ChainPair[]>(
    address ? ['failed_chain_pairs', address] : null,
  );
  const connectedChainId = chain?.id;
  const canFetch = canFetchTransactionHistory({
    address,
    isLoadingAccountType,
    isTxHistoryEnabled,
    isSmartContractWallet,
    connectedChainId,
  });
  // SCW history is network-specific, so scope the cache by the connected chain
  // to revalidate on network switch. EOA history is network-agnostic.
  const smartContractWalletChainScope = isSmartContractWallet ? connectedChainId : undefined;

  const fetcher = useCallback(
    (type: 'deposits' | 'withdrawals') => {
      if (!canFetch) {
        return [];
      }

      return Promise.all(
        getMultiChainFetchList()
          .filter((chainPair) => {
            // Only fetch chain pairs touching a selected chain — the same rule
            // as the display filter, so the fetch list and the shown
            // transactions can't disagree.
            if (
              !matchesChainFilter({
                selectedChainIds,
                sourceChainId: chainPair.parentChainId,
                destinationChainId: chainPair.childChainId,
              })
            ) {
              return false;
            }

            if (isSmartContractWallet) {
              if (typeof connectedChainId === 'undefined') {
                return false;
              }
              // only fetch txs from the connected network
              return [chainPair.parentChainId, chainPair.childChainId].includes(connectedChainId);
            }

            return isNetwork(chainPair.parentChainId).isTestnet === isTestnetMode;
          })
          .map(async (chainPair) => {
            // SCW address is tied to a specific network
            // that's why we need to limit shown txs either to sent or received funds
            // otherwise we'd display funds for a different network, which could be someone else's account
            const isConnectedToParentChain = chainPair.parentChainId === connectedChainId;

            const includeSentTxs = shouldIncludeSentTxs({
              type,
              isSmartContractWallet,
              isConnectedToParentChain,
            });

            const includeReceivedTxs = shouldIncludeReceivedTxs({
              type,
              isSmartContractWallet,
              isConnectedToParentChain,
            });
            try {
              const batchSizeBlocks = BATCH_FETCH_BLOCKS[chainPair.childChainId];

              const withdrawalFn =
                typeof batchSizeBlocks === 'number' ? fetchWithdrawalsInBatches : fetchWithdrawals;

              const fetcherFn = type === 'deposits' ? fetchDeposits : withdrawalFn;

              // else, fetch deposits or withdrawals
              return await fetcherFn({
                sender: includeSentTxs ? address : undefined,
                receiver: includeReceivedTxs ? address : undefined,
                l1Provider: getProviderForChainId(chainPair.parentChainId),
                parentChainId: chainPair.parentChainId,
                l2Provider: getProviderForChainId(chainPair.childChainId),
                pageNumber: 0,
                pageSize: 1000,
                forceFetchReceived,
                batchSizeBlocks,
              });
            } catch {
              addFailedChainPair((prevFailedChainPairs) => {
                if (!prevFailedChainPairs) {
                  return [chainPair];
                }
                if (
                  typeof prevFailedChainPairs.find(
                    (prevPair) =>
                      prevPair.parentChainId === chainPair.parentChainId &&
                      prevPair.childChainId === chainPair.childChainId,
                  ) !== 'undefined'
                ) {
                  // already added
                  return prevFailedChainPairs;
                }

                return [...prevFailedChainPairs, chainPair];
              });

              return [];
            }
          }),
      );
    },
    [
      addFailedChainPair,
      address,
      canFetch,
      connectedChainId,
      forceFetchReceived,
      isSmartContractWallet,
      isTestnetMode,
      selectedChainIds,
    ],
  );

  const {
    data: depositsData,
    error: depositsError,
    isLoading: depositsLoading,
  } = useSWRImmutable(
    canFetch
      ? [
          'tx_list',
          'deposits',
          address,
          isTestnetMode,
          smartContractWalletChainScope,
          selectedChainIdsKey,
        ]
      : null,
    () => fetcher('deposits'),
  );

  const {
    data: withdrawalsData,
    error: withdrawalsError,
    isLoading: withdrawalsLoading,
  } = useSWRImmutable(
    canFetch
      ? [
          'tx_list',
          'withdrawals',
          address,
          isTestnetMode,
          forceFetchReceived,
          smartContractWalletChainScope,
          selectedChainIdsKey,
        ]
      : null,
    () => fetcher('withdrawals'),
  );

  const deposits = (depositsData || []).flat();

  const withdrawals = (withdrawalsData || []).flat();
  const lifiHistoryTransactions = lifiHistoryTransfers || [];

  // CCTP, OFT and LiFi are fetched by single API calls rather than the scoped
  // chain-pair fan-out, so filter them here — before pagination — to keep
  // unrelated transfers from consuming page slots and per-tx mapping work.
  const matchesSelectedChains = makeMatchesSelectedChains(selectedChainIds);

  // merge deposits and withdrawals and sort them by date
  const transactions: Transfer[] = [
    ...deposits,
    ...withdrawals,
    ...(isTestnetMode ? combinedCctpTestnetTransfers : combinedCctpMainnetTransfers).filter(
      matchesSelectedChains,
    ),
    ...oftTransfers.filter(matchesSelectedChains),
    ...lifiHistoryTransactions.filter(matchesSelectedChains),
  ].flat();

  return {
    data: transactions,
    loading:
      isLoadingAccountType ||
      depositsLoading ||
      withdrawalsLoading ||
      cctpLoading ||
      oftLoading ||
      lifiHistoryLoading,
    error: depositsError ?? withdrawalsError,
    failedChainPairs: failedChainPairs || [],
  };
};

/**
 * Maps additional info to previously fetches transaction history, starting with the earliest data.
 * This is done in small batches to safely meet RPC limits.
 */
export const useTransactionHistory = (
  address: Address | undefined,
  // TODO: look for a solution to this. It's used for now so that useEffect that handles pagination runs only a single instance.
  { runFetcher = false } = {},
): UseTransactionHistoryResult => {
  const [isTestnetMode] = useIsTestnetMode();
  const { chain } = useAccount();
  const { accountType, isLoading: isLoadingAccountType } = useAccountType(address);
  const isSmartContractWallet = accountType === 'smart-contract-wallet';

  const { isFeatureDisabled } = useDisabledFeatures();
  const isTxHistoryEnabled = !isFeatureDisabled(DisabledFeatures.TX_HISTORY);

  const selectedChainIds = useSelectedChainIds();

  const lifiTransactions = useLifiMergedTransactionCacheStore((state) => state.transactions);
  const updateLifiTransactionInCache = useLifiMergedTransactionCacheStore(
    (state) => state.updateTransaction,
  );
  const { connector } = useAccount();
  // max number of transactions mapped in parallel
  const MAX_BATCH_SIZE = 3;
  // Pause fetching after specified number of days. User can resume fetching to get another batch.
  const PAUSE_SIZE_DAYS = 30;

  const [fetching, setFetching] = useState(true);
  const [pauseCount, setPauseCount] = useState(0);

  const {
    data,
    loading: isLoadingTxsWithoutStatus,
    error,
    failedChainPairs,
  } = useTransactionHistoryWithoutStatuses(address);

  const getCacheKey = useCallback(
    (pageNumber: number, prevPageTxs: MergedTransaction[]) => {
      if (prevPageTxs) {
        if (prevPageTxs.length === 0) {
          // THIS is the last page
          return null;
        }
      }

      return address && !isLoadingTxsWithoutStatus && !isLoadingAccountType
        ? (['complete_tx_list', address, pageNumber, data] as const)
        : null;
    },
    [address, isLoadingTxsWithoutStatus, data, isLoadingAccountType],
  );

  const depositsFromCache = useMemo(() => {
    if (isLoadingAccountType || !chain || !isTxHistoryEnabled) {
      return [];
    }
    return getDepositsWithoutStatusesFromCache(address)
      .filter((tx) => isNetwork(tx.parentChainId).isTestnet === isTestnetMode)
      .filter((tx) =>
        matchesChainFilter({
          selectedChainIds,
          sourceChainId: tx.parentChainId,
          destinationChainId: tx.childChainId,
        }),
      )
      .filter((tx) => {
        const chainPairExists = getMultiChainFetchList().some((chainPair) => {
          return (
            chainPair.parentChainId === tx.parentChainId &&
            chainPair.childChainId === tx.childChainId
          );
        });

        if (!chainPairExists) {
          // chain pair doesn't exist in the fetch list but exists in cached transactions
          // this could happen if user made a transfer with a custom Orbit chain and then removed the network
          // we don't want to include these txs as it would cause tx history errors
          return false;
        }

        if (isSmartContractWallet) {
          if (!chain) {
            return false;
          }
          // only include txs for the connected network
          return tx.parentChainId === chain.id;
        }
        return true;
      });
  }, [
    address,
    isTestnetMode,
    isLoadingAccountType,
    isSmartContractWallet,
    chain,
    isTxHistoryEnabled,
    selectedChainIds,
  ]);

  const lifiTransactionsFromCache = useMemo(() => {
    if (
      !useLifiMergedTransactionCacheStore.persist.hasHydrated ||
      !address ||
      !isTxHistoryEnabled
    ) {
      return [];
    }

    return (lifiTransactions[address] || []).filter((tx) =>
      matchesChainFilter({
        selectedChainIds,
        sourceChainId: tx.sourceChainId,
        destinationChainId: tx.destinationChainId,
      }),
    );
  }, [address, lifiTransactions, isTxHistoryEnabled, selectedChainIds]);

  const {
    data: txPages,
    error: txPagesError,
    size: page,
    setSize: setPage,
    mutate: mutateTxPages,
    isValidating,
    isLoading: isLoadingFirstPage,
  } = useSWRInfinite(
    getCacheKey,
    ([, , _page, _data]) => {
      // we get cached data and dedupe here because we need to ensure _data never mutates
      // otherwise, if we added a new tx to cache, it would return a new reference and cause the SWR key to update, resulting in refetching
      // duplicates may occur when txs are taken from the local storage
      // we don't use Set because it wouldn't dedupe objects with different reference (we fetch them from different sources)
      // LiFi history is fetched from the API and local cache; putting cache first lets fresher API records win.
      const dedupedTransactions = getDedupedTransactionsForPagination({
        fetchedTransactions: _data,
        cachedDeposits: depositsFromCache,
        cachedLifiTransactions: lifiTransactionsFromCache,
      });

      const startIndex = _page * MAX_BATCH_SIZE;
      const endIndex = startIndex + MAX_BATCH_SIZE;

      return Promise.all(dedupedTransactions.slice(startIndex, endIndex).map(transformTransaction));
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      revalidateFirstPage: false,
      keepPreviousData: true,
      dedupingInterval: 1_000_000,
    },
  );

  // based on an example from SWR
  // https://swr.vercel.app/examples/infinite-loading
  const isLoadingMore =
    page > 0 && typeof txPages !== 'undefined' && typeof txPages[page - 1] === 'undefined';

  const completed =
    !isLoadingFirstPage && typeof txPages !== 'undefined' && data.length === txPages.flat().length;

  // transfers initiated by the user during the current session
  // we store it separately as there are a lot of side effects when mutating SWRInfinite
  const { newTransactionsData, mutateNewTransactionsData, addPendingTransaction } =
    useAddPendingTransactions(address);

  const transactions: MergedTransaction[] = useMemo(() => {
    // The fetch inputs are scoped with the debounced selection, so this filter
    // keeps already-built pages consistent with the instant selection during
    // the debounce window. Transfers initiated this session (newTransactions)
    // are exempt so a just-submitted transfer is always visible.
    const filteredTxPages = txPages?.map((txPage) =>
      txPage.filter((tx) =>
        matchesChainFilter({
          selectedChainIds,
          sourceChainId: tx.sourceChainId,
          destinationChainId: tx.destinationChainId,
        }),
      ),
    );

    return mergeTransactions({
      address,
      newTransactions: newTransactionsData,
      fetchedTransactions: filteredTxPages,
    });
  }, [newTransactionsData, txPages, address, selectedChainIds]);

  const updateCachedTransaction = useCallback(
    (newTx: MergedTransaction) => {
      // check if tx is a new transaction initiated by the user, and update it
      const foundInNewTransactions =
        typeof newTransactionsData?.find((oldTx) => isSameTransaction(oldTx, newTx)) !==
        'undefined';

      if (foundInNewTransactions) {
        // replace the existing tx with the new tx
        mutateNewTransactionsData((txs) =>
          txs?.map((oldTx) => {
            return { ...(isSameTransaction(oldTx, newTx) ? newTx : oldTx) };
          }),
        );
        if (isLifiTransfer(newTx)) {
          updateLifiTransactionInCache(newTx);
        }
      }

      // the same tx can also exist in the paginated history (txPages, seeded from the
      // localStorage deposits cache), and mergeTransactions displays that copy, so it
      // must be updated too
      mutateTxPages((prevTxPages) => {
        if (!prevTxPages) {
          return;
        }

        let pageNumberToUpdate = 0;

        // search cache for the tx to update
        while (!prevTxPages[pageNumberToUpdate]?.find((oldTx) => isSameTransaction(oldTx, newTx))) {
          pageNumberToUpdate++;

          if (pageNumberToUpdate > prevTxPages.length) {
            // tx not found
            return prevTxPages;
          }
        }

        const oldPageToUpdate = prevTxPages[pageNumberToUpdate];

        if (!oldPageToUpdate) {
          return prevTxPages;
        }

        // replace the old tx with the new tx
        const updatedPage = oldPageToUpdate.map((oldTx) => {
          return isSameTransaction(oldTx, newTx) ? newTx : oldTx;
        });

        // all old pages including the new updated page
        const newTxPages = [
          ...prevTxPages.slice(0, pageNumberToUpdate),
          updatedPage,
          ...prevTxPages.slice(pageNumberToUpdate + 1),
        ];

        if (isLifiTransfer(newTx)) {
          updateLifiTransactionInCache(newTx);
        }
        return newTxPages;
      }, false);
    },
    [mutateNewTransactionsData, mutateTxPages, newTransactionsData, updateLifiTransactionInCache],
  );

  const updatePendingTransaction = useCallback(
    async (tx: MergedTransaction) => {
      if (!isTxPending(tx)) {
        // if not pending we don't need to check for status, we accept whatever status is passed in
        updateCachedTransaction(tx);
        return;
      }

      if (isOftTransfer(tx)) {
        const updatedOftTransfer = await getUpdatedOftTransfer(tx);
        updateCachedTransaction(updatedOftTransfer);
        return;
      }

      if (tx.isCctp) {
        const updatedCctpTransfer = await getUpdatedCctpTransfer(tx);
        updateCachedTransaction(updatedCctpTransfer);
        return;
      }

      if (isLifiTransfer(tx)) {
        const updatedLifiTransfer = await getUpdatedLifiTransfer(tx);
        updateCachedTransaction(updatedLifiTransfer);
        return;
      }

      // ETH or token withdrawal
      if (tx.isWithdrawal) {
        const updatedWithdrawal = await getUpdatedWithdrawal(tx);
        updateCachedTransaction(updatedWithdrawal);
        return;
      }

      // eth deposits (either via eth deposit messages or retryable tickets)
      if (tx.assetType === AssetType.ETH) {
        const updatedEthDeposit = await getUpdatedEthDeposit(tx);
        updateCachedTransaction(updatedEthDeposit);
        return;
      }

      // token deposits (via retryable tickets)
      const updatedRetryableDeposit = await getUpdatedRetryableDeposit(tx);
      updateCachedTransaction(updatedRetryableDeposit);
    },
    [updateCachedTransaction],
  );

  useEffect(() => {
    if (!runFetcher || !connector) {
      return;
    }
    connector.onAccountsChanged = (accounts: string[]) => {
      // reset state on account change
      if (accounts.length > 0) {
        setPage(1);
        setPauseCount(0);
        setFetching(true);
      }
    };
  }, [connector, runFetcher, setPage]);

  useEffect(() => {
    if (!txPages || !fetching || !runFetcher || isValidating) {
      return;
    }

    const firstPage = txPages[0];
    const lastPage = txPages[txPages.length - 1];

    if (!firstPage || !lastPage) {
      return;
    }

    // if a full page is fetched, we need to fetch more
    const shouldFetchNextPage = lastPage.length === MAX_BATCH_SIZE;

    if (!shouldFetchNextPage) {
      setFetching(false);
      return;
    }

    const newestTx = firstPage[0];
    const oldestTx = lastPage[lastPage.length - 1];

    if (!newestTx || !oldestTx) {
      return;
    }

    const oldestTxDaysAgo = dayjs().diff(dayjs(oldestTx.createdAt ?? 0), 'days');

    const nextPauseThresholdDays = (pauseCount + 1) * PAUSE_SIZE_DAYS;
    const shouldPause = oldestTxDaysAgo >= nextPauseThresholdDays;

    if (shouldPause) {
      pause();
      setPauseCount((prevPauseCount) => prevPauseCount + 1);
      return;
    }

    // make sure we don't over-fetch
    if (page === txPages.length) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [txPages, setPage, page, pauseCount, fetching, runFetcher, isValidating]);

  useEffect(() => {
    if (typeof error !== 'undefined') {
      logger.warn(error);
      captureSentryErrorWithExtraData({
        error,
        originFunction: 'useTransactionHistoryWithoutStatuses',
      });
    }

    if (typeof txPagesError !== 'undefined') {
      logger.warn(txPagesError);
      captureSentryErrorWithExtraData({
        error: txPagesError,
        originFunction: 'useTransactionHistory',
      });
    }
  }, [error, txPagesError]);

  function pause() {
    setFetching(false);
  }

  function resume() {
    setFetching(true);
    setPage((prevPage) => prevPage + 1);
  }

  if (isLoadingTxsWithoutStatus || error) {
    return {
      transactions: newTransactionsData || [],
      loading: isLoadingTxsWithoutStatus,
      error,
      failedChainPairs: [],
      completed: true,
      pause,
      resume,
      addPendingTransaction,
      updatePendingTransaction,
    };
  }

  return {
    transactions,
    loading: isLoadingFirstPage || isLoadingMore,
    completed,
    error: txPagesError ?? error,
    failedChainPairs,
    pause,
    resume,
    addPendingTransaction,
    updatePendingTransaction,
  };
};

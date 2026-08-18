import { Tab } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { shallow } from 'zustand/shallow';

import { useForceFetchReceived, useTransactionHistory } from '../../hooks/useTransactionHistory';
import { MergedTransaction } from '../../state/app/state';
import { addressesEqual } from '../../util/AddressUtils';
import { TransactionStatusInfo } from '../TransactionHistory/TransactionStatusInfo';
import { TabButton } from '../common/Tab';
import { TransactionHistoryDisclaimer } from './TransactionHistoryDisclaimer';
import {
  useTransactionHistoryAddressStore,
  useTxHashSearchState,
} from './TransactionHistorySearchBar';
import { ContentWrapper, TransactionHistoryTable } from './TransactionHistoryTable';
import { TransactionsTableDetails } from './TransactionsTableDetails';
import { isTxClaimable, isTxCompleted, isTxExpired, isTxFailed, isTxPending } from './helpers';

function useTransactionHistoryUpdater() {
  const sanitizedAddress = useTransactionHistoryAddressStore((state) => state.sanitizedAddress);
  const { isTxHashSearch } = useTxHashSearchState();

  const transactionHistoryProps = useTransactionHistory(sanitizedAddress, {
    runFetcher: true,
  });

  const { transactions, updatePendingTransaction } = transactionHistoryProps;

  const pendingTransactions = useMemo(() => {
    return transactions.filter(isTxPending);
  }, [transactions]);

  useEffect(() => {
    const interval = setInterval(() => {
      const [firstPendingTransaction] = pendingTransactions;

      // in tx hash search mode one update refetches the whole search
      if (isTxHashSearch) {
        if (firstPendingTransaction) {
          updatePendingTransaction(firstPendingTransaction);
        }
        return;
      }

      pendingTransactions.forEach(updatePendingTransaction);
    }, 10_000);

    return () => clearInterval(interval);
  }, [pendingTransactions, updatePendingTransaction, isTxHashSearch]);

  return transactionHistoryProps;
}

const tabClasses =
  'text-white px-3 mr-2 border-b-2 ui-selected:border-white ui-not-selected:border-transparent ui-not-selected:text-white/80 arb-hover';

export function TransactionHistorySearchResults() {
  const props = useTransactionHistoryUpdater();
  const { transactions, loading, error } = props;
  const { isTxHashSearch } = useTxHashSearchState();
  const { address: connectedAddress } = useAccount();

  const isForeignTxHashResult =
    isTxHashSearch &&
    typeof connectedAddress !== 'undefined' &&
    transactions.length > 0 &&
    transactions.every(
      (tx) =>
        !addressesEqual(tx.sender, connectedAddress) &&
        !addressesEqual(tx.destination, connectedAddress),
    );
  const { forceFetchReceived, setForceFetchReceived } = useForceFetchReceived(
    (state) => ({
      forceFetchReceived: state.forceFetchReceived,
      setForceFetchReceived: state.setForceFetchReceived,
    }),
    shallow,
  );
  const searchError = useTransactionHistoryAddressStore((state) => state.searchError);
  const txHistoryAddress = useTransactionHistoryAddressStore((state) => state.sanitizedAddress);

  const oldestTxTimeAgoString = useMemo(() => {
    return dayjs(transactions[transactions.length - 1]?.createdAt).toNow(true);
  }, [transactions]);

  const groupedTransactions = useMemo(
    () =>
      transactions.reduce(
        (acc, tx) => {
          if (isTxCompleted(tx) || isTxExpired(tx)) {
            acc.settled.push(tx);
          }
          if (isTxPending(tx)) {
            acc.pending.push(tx);
          }
          if (isTxClaimable(tx)) {
            acc.claimable.push(tx);
          }
          if (isTxFailed(tx) && !isTxCompleted(tx)) {
            acc.failed.push(tx);
          }
          return acc;
        },
        {
          settled: [] as MergedTransaction[],
          pending: [] as MergedTransaction[],
          claimable: [] as MergedTransaction[],
          failed: [] as MergedTransaction[],
        },
      ),
    [transactions],
  );

  const pendingTransactions = [
    ...groupedTransactions.failed,
    ...groupedTransactions.pending,
    ...groupedTransactions.claimable,
  ];

  const settledTransactions = groupedTransactions.settled;

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const autoSwitchedTabForTxHash = useRef<string | undefined>(undefined);
  const { sanitizedTxHash } = useTxHashSearchState();

  // When a hash search finds only a settled tx, open the settled tab for the
  // user, once per searched hash so manual tab changes stick.
  useEffect(() => {
    if (!isTxHashSearch || loading || typeof sanitizedTxHash === 'undefined') {
      return;
    }
    // wait for a result: an empty render can occur before loading flips on
    if (pendingTransactions.length === 0 && settledTransactions.length === 0) {
      return;
    }
    if (autoSwitchedTabForTxHash.current === sanitizedTxHash) {
      return;
    }
    autoSwitchedTabForTxHash.current = sanitizedTxHash;
    setSelectedTabIndex(pendingTransactions.length === 0 ? 1 : 0);
  }, [
    isTxHashSearch,
    loading,
    sanitizedTxHash,
    pendingTransactions.length,
    settledTransactions.length,
  ]);

  if (searchError) {
    return (
      <ContentWrapper>
        <p>{searchError}</p>
      </ContentWrapper>
    );
  }

  if (isTxHashSearch && !loading && !error && transactions.length === 0) {
    return (
      <ContentWrapper>
        <p>
          We could not find this transaction on the selected chains. Make sure the hash is correct.
          Make sure the chain filter includes the chain where the transaction started.
        </p>
      </ContentWrapper>
    );
  }

  return (
    <>
      <div className="pr-4 md:pr-0">
        {isForeignTxHashResult ? (
          // replaces the claim reminder: it addresses the connected wallet,
          // which this searched transaction does not belong to
          <div className="mb-3 mt-3 w-full rounded border-x-0 border-white/30 bg-orange-dark px-3 py-2 text-left text-sm text-white sm:border md:mt-0">
            <div className="flex space-x-2">
              <ExclamationTriangleIcon width={20} className="shrink-0" />
              <span>The searched transaction does not belong to your connected wallet.</span>
            </div>
          </div>
        ) : (
          <TransactionStatusInfo />
        )}
      </div>

      <div className="mb-4">
        <TransactionHistoryDisclaimer />
      </div>

      <Tab.Group
        as="div"
        className="h-full overflow-hidden rounded md:pr-0"
        selectedIndex={selectedTabIndex}
        onChange={setSelectedTabIndex}
      >
        <Tab.List className="mb-4 flex border-b border-white/30">
          <TabButton aria-label="show pending transactions" className={tabClasses}>
            <span className="text-sm md:text-base">Pending transactions</span>
          </TabButton>
          <TabButton aria-label="show settled transactions" className={tabClasses}>
            <span className="text-sm md:text-base">Settled transactions</span>
          </TabButton>
        </Tab.List>

        {!isTxHashSearch && !forceFetchReceived && typeof txHistoryAddress !== 'undefined' && (
          <div className="mb-2 text-xs text-white">
            Missing a transaction after sending to or receiving from a different address? Click{' '}
            <button onClick={() => setForceFetchReceived(true)} className="arb-hover underline">
              here
            </button>{' '}
            for a detailed search.
          </div>
        )}

        <Tab.Panels className="h-full w-full overflow-hidden">
          <Tab.Panel className="h-full w-full">
            <TransactionHistoryTable
              {...props}
              transactions={pendingTransactions}
              selectedTabIndex={0}
              oldestTxTimeAgoString={oldestTxTimeAgoString}
            />
          </Tab.Panel>
          <Tab.Panel className="h-full w-full">
            <TransactionHistoryTable
              {...props}
              transactions={settledTransactions}
              selectedTabIndex={1}
              oldestTxTimeAgoString={oldestTxTimeAgoString}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      <TransactionsTableDetails />
    </>
  );
}

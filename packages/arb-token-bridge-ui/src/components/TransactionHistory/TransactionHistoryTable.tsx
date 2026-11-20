import { Disclosure } from '@headlessui/react';
import {
  ChevronRightIcon,
  ExclamationCircleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import {
  ButtonHTMLAttributes,
  PropsWithChildren,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Column, Table, TableCellDataGetter } from 'react-virtualized';
import { twMerge } from 'tailwind-merge';

import { Tooltip } from '@/app/components/common/Tooltip';

import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { FailedTx, UseTransactionHistoryResult } from '../../hooks/useTransactionHistory';
import { MergedTransaction } from '../../state/app/state';
import { isTokenDeposit } from '../../state/app/utils';
import { getNetworkName } from '../../util/networks';
import { ChainPair } from '../../util/txHistoryRoutes';
import { EmptyTransactionHistory } from './EmptyTransactionHistory';
import { PendingDepositWarning } from './PendingDepositWarning';
import { TransactionsTableRow } from './TransactionsTableRow';
import { isTxPending } from './helpers';

export const BatchTransferNativeTokenTooltip = ({
  children,
  tx,
}: PropsWithChildren<{ tx: MergedTransaction }>) => {
  const nativeCurrency = useNativeCurrency({ chainId: tx.childChainId });

  return (
    <Tooltip
      content={`This is any additional ${nativeCurrency.symbol} you might have deposited along with your ERC-20, plus the refunded excess gas fee.`}
    >
      <span>{children}</span>
    </Tooltip>
  );
};

export const ContentWrapper = forwardRef<HTMLDivElement, PropsWithChildren<{ className?: string }>>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          'w-full flex-col items-center rounded px-3 py-2 text-center text-sm text-white lg:text-left',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ContentWrapper.displayName = 'ContentWrapper';

const TableHeader = ({ children, className }: PropsWithChildren<{ className?: string }>) => (
  <div className={twMerge('h-full w-full pb-2 pt-4 text-left text-sm font-normal', className)}>
    {children}
  </div>
);

const tableCellDataGetter: TableCellDataGetter = ({ rowData, dataKey }) => rowData?.[dataKey];
const tableCellRenderer = () => null;

export const LoadMoreButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button {...props} className="arb-hover text-xs" aria-label="Load More Transactions">
      <div className="flex space-x-1 rounded border border-white px-2 py-1">
        <span>Load more</span>
        <PlusCircleIcon width={16} />
      </div>
    </button>
  );
};

export const HistoryLoader = () => {
  return <span className="animate-pulse">Loading transactions...</span>;
};

const FailedLoadsWarning = ({
  failedChainPairs,
  failedTxs,
}: {
  failedChainPairs: ChainPair[];
  failedTxs: FailedTx[];
}) => {
  if (failedChainPairs.length === 0 && failedTxs.length === 0) {
    return null;
  }

  const warningLabel = [
    failedChainPairs.length > 0 &&
      `We were unable to fetch data for the following chain pairs: ${failedChainPairs
        .map(
          (pair) => `${getNetworkName(pair.parentChainId)} to ${getNetworkName(pair.childChainId)}`,
        )
        .join(', ')}`,
    failedTxs.length > 0 && `We were unable to load ${failedTxs.length} transaction(s)`,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Disclosure
      as="div"
      role="status"
      aria-label={warningLabel}
      data-testid="failed-chain-pairs-warning"
      className="mt-4 flex w-full flex-col justify-start gap-1 rounded border border-orange-dark bg-orange p-3 text-sm text-orange-dark"
    >
      <Disclosure.Button className="flex items-center text-left">
        <div className="flex items-start gap-1">
          <ExclamationCircleIcon className="mt-[2px] h-3 w-3 shrink-0 stroke-orange-dark" />
          <p>
            Some transactions couldn&apos;t be loaded. Refresh the page, or search by transaction
            hash to find them.
          </p>
        </div>
        <ChevronRightIcon className="ml-auto h-3 w-3 shrink-0 ui-open:rotate-90 ui-open:transform" />
      </Disclosure.Button>
      <Disclosure.Panel className="flex flex-col gap-2 pl-4 text-xs">
        {failedChainPairs.length > 0 && (
          <div className="flex flex-col gap-1">
            <span>We were unable to fetch data for the following chain pairs:</span>
            <ul className="flex list-disc flex-col pl-4">
              {failedChainPairs.map((pair) => (
                <li key={`${pair.parentChainId}-${pair.childChainId}`}>
                  <b>{getNetworkName(pair.parentChainId)}</b>
                  {' <> '}
                  <b>{getNetworkName(pair.childChainId)}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
        {failedTxs.length > 0 && (
          <div className="flex flex-col gap-1">
            <span>We were unable to load the following transactions:</span>
            <ul className="flex list-disc flex-col pl-4">
              {failedTxs.map((tx, index) => (
                <li key={`${tx.txId}-${index}`} className="break-all">
                  <span className="font-mono">{tx.txId}</span>
                  {' ('}
                  {getNetworkName(tx.parentChainId)}
                  {' <> '}
                  {getNetworkName(tx.childChainId)})
                </li>
              ))}
            </ul>
          </div>
        )}
      </Disclosure.Panel>
    </Disclosure>
  );
};

type TransactionHistoryTableProps = UseTransactionHistoryResult & {
  selectedTabIndex: number;
  oldestTxTimeAgoString: string;
};

export const TransactionHistoryTable = (props: TransactionHistoryTableProps) => {
  const {
    transactions,
    loading,
    completed,
    error,
    failedChainPairs,
    failedTxs,
    resume,
    updateTransaction,
    selectedTabIndex,
    oldestTxTimeAgoString,
  } = props;

  const TABLE_HEADER_HEIGHT = 52;
  const TABLE_ROW_HEIGHT = 60;
  const isTxHistoryEmpty = transactions.length === 0;
  const isPendingTab = selectedTabIndex === 0;

  const paused = !loading && !completed;

  const contentWrapperRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<Table | null>(null);
  const [tableHeight, setTableHeight] = useState(
    TABLE_ROW_HEIGHT * (transactions.length + 1) + TABLE_HEADER_HEIGHT,
  );

  useEffect(() => {
    const updateTableHeight = () => {
      if (window.innerWidth < 768) {
        setTableHeight(TABLE_ROW_HEIGHT * (transactions.length + 1) + TABLE_HEADER_HEIGHT);
        return;
      }

      const SIDE_PANEL_HEADER_HEIGHT = 125;
      const viewportHeight = window.innerHeight;
      const contentWrapperOffsetTop = contentWrapperRef.current?.offsetTop ?? 0;

      setTableHeight(
        Math.max(
          // we subtract a little padding at the end so that the table doesn't end at the edge of the screen
          viewportHeight - contentWrapperOffsetTop - SIDE_PANEL_HEADER_HEIGHT,
          0,
        ),
      );
    };

    updateTableHeight();
    window.addEventListener('resize', updateTableHeight);

    return () => window.removeEventListener('resize', updateTableHeight);
  }, [transactions.length]);

  const pendingTokenDepositsCount = useMemo(() => {
    return transactions.filter((tx) => isTokenDeposit(tx) && isTxPending(tx)).length;
  }, [transactions]);

  const topmostPendingTxId = useMemo(() => {
    return transactions.filter(isTxPending)[0]?.txId;
  }, [transactions]);

  // recalculate table height when tx number changes, or when user selects different tab
  useEffect(() => {
    tableRef.current?.recomputeRowHeights();
  }, [transactions.length, selectedTabIndex, isTxHistoryEmpty, tableHeight]);

  if (isTxHistoryEmpty) {
    return (
      <>
        {/* an outage leaves nothing to list, so the warning has to render here too */}
        <FailedLoadsWarning failedChainPairs={failedChainPairs} failedTxs={failedTxs} />
        <EmptyTransactionHistory
          loading={loading}
          // with a chain unchecked, "no transactions" could be a lie
          isError={
            typeof error !== 'undefined' ||
            failedChainPairs.length > 0 ||
            // while paused, keep the Load more button instead of the error
            (completed && failedTxs.length > 0)
          }
          paused={paused}
          resume={resume}
          tabType={isPendingTab ? 'pending' : 'settled'}
        />
      </>
    );
  }

  return (
    <ContentWrapper
      ref={contentWrapperRef}
      className="relative block h-full min-h-[1px] w-full overflow-y-auto rounded p-0 text-left md:overflow-x-hidden md:border md:border-white"
    >
      <div
        className={twMerge(
          'sticky left-0 w-full rounded-tr-lg pr-4 md:px-4 md:pt-4',
          isPendingTab ? '' : 'rounded-tl-lg',
        )}
      >
        {loading ? (
          <div className="flex h-[28px] items-center space-x-2">
            <HistoryLoader />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center justify-start space-x-1">
              <span className="text-xs">
                Showing {transactions.length} {isPendingTab ? 'pending' : 'settled'} transactions
                made in {oldestTxTimeAgoString}.
              </span>
            </div>

            {!completed && <LoadMoreButton onClick={resume} />}
          </div>
        )}
        <FailedLoadsWarning failedChainPairs={failedChainPairs} failedTxs={failedTxs} />
        <div>{pendingTokenDepositsCount > 0 && <PendingDepositWarning />}</div>
      </div>

      <Table
        ref={tableRef}
        width={960}
        height={tableHeight}
        rowHeight={TABLE_ROW_HEIGHT}
        rowCount={transactions.length}
        headerHeight={TABLE_HEADER_HEIGHT}
        headerRowRenderer={(props) => (
          <div className="flex w-[960px] border-b border-white/30 text-white md:mx-4">
            {props.columns}
          </div>
        )}
        className="table-auto last:border-b-0"
        rowGetter={({ index }) => transactions[index]}
        rowRenderer={({ index, style }) => {
          const tx = transactions[index];

          if (!tx) {
            return null;
          }

          const isLastRow = index + 1 === transactions.length;
          const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`;
          const secondsPassed = dayjs().diff(dayjs(tx.createdAt), 'second');

          // only blink the topmost tx, in case many txs are queued in a short amount of time
          const isTopmostPendingTx = topmostPendingTxId && topmostPendingTxId === tx.txId;

          return (
            <div key={key} style={style}>
              <TransactionsTableRow
                tx={tx}
                updateTransaction={updateTransaction}
                className={twMerge(
                  isLastRow && 'border-b-0',
                  isTopmostPendingTx && secondsPassed <= 30 && 'animate-blink bg-highlight',
                )}
              />
            </div>
          );
        }}
      >
        <Column
          label="time"
          dataKey="time"
          width={100}
          cellDataGetter={tableCellDataGetter}
          cellRenderer={tableCellRenderer}
          flexGrow={0}
          flexShrink={1}
          headerRenderer={() => <TableHeader>TIME</TableHeader>}
        />
        <Column
          label="token"
          dataKey="token"
          width={140}
          cellDataGetter={tableCellDataGetter}
          cellRenderer={tableCellRenderer}
          flexGrow={0}
          flexShrink={1}
          headerRenderer={() => <TableHeader>FROM TOKEN</TableHeader>}
        />
        <Column
          label="to-token"
          dataKey="to-token"
          width={120}
          cellDataGetter={tableCellDataGetter}
          cellRenderer={tableCellRenderer}
          flexGrow={0}
          flexShrink={1}
          headerRenderer={() => <TableHeader>TO TOKEN</TableHeader>}
        />
        <Column
          label="from"
          dataKey="from"
          width={120}
          cellDataGetter={tableCellDataGetter}
          cellRenderer={tableCellRenderer}
          flexGrow={0}
          flexShrink={1}
          headerRenderer={() => <TableHeader>FROM</TableHeader>}
        />
        <Column
          label="to"
          dataKey="to"
          width={120}
          cellDataGetter={tableCellDataGetter}
          cellRenderer={tableCellRenderer}
          flexGrow={0}
          flexShrink={1}
          headerRenderer={() => <TableHeader>TO</TableHeader>}
        />
        <Column
          label="status"
          dataKey="status"
          width={90}
          cellDataGetter={tableCellDataGetter}
          cellRenderer={tableCellRenderer}
          flexGrow={0}
          flexShrink={1}
          headerRenderer={() => <TableHeader>STATUS</TableHeader>}
        />
      </Table>
    </ContentWrapper>
  );
};

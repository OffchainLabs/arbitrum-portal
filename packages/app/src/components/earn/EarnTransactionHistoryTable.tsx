'use client';

import { ArrowTopRightOnSquareIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { OpportunityCategory } from '@/app-types/earn/vaults';
import { NetworkImage } from '@/bridge/components/common/NetworkImage';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { normalizeTimestamp } from '@/bridge/state/app/utils';
import { shortenTxHash } from '@/bridge/util/CommonUtils';
import { formatAmount } from '@/bridge/util/NumberUtils';
import { getExplorerUrl } from '@/bridge/util/networks';
import { ExternalLink } from '@/components/ExternalLink';
import type { EarnChainId } from '@/earn-api/types';

import type { TransactionDetails } from './EarnTransactionDetailsPopup';

export interface EarnTransactionHistoryRow {
  timestamp: number;
  eventType: string;
  assetAmountRaw: string;
  assetSymbol: string;
  decimals: number;
  assetLogo?: string;
  inputAssetAmountRaw?: string;
  inputAssetSymbol?: string;
  inputAssetDecimals?: number;
  inputAssetLogo?: string;
  outputAssetAmountRaw?: string;
  outputAssetSymbol?: string;
  outputAssetDecimals?: number;
  outputAssetLogo?: string;
  chainId: EarnChainId;
  chainName: string;
  transactionHash: string;
}

interface EarnTransactionHistoryTableProps {
  category: OpportunityCategory;
  rows: EarnTransactionHistoryRow[];
  getDateStr: (timestamp: number) => string;
  getTimeStr: (timestamp: number) => string;
  onRowClick?: (details: TransactionDetails, isCompleted?: boolean) => void;
  opportunityName?: string;
  protocolName?: string;
  protocolLogo?: string;
}

const EVENT_TYPE_TO_ACTION: Record<string, string> = {
  deposit: 'supply',
  redeem: 'withdraw',
  withdraw: 'withdraw',
  supply: 'supply',
  enter: 'enter',
  exit: 'exit',
  buy: 'buy',
  sell: 'sell',
  claim: 'claim',
};

function getDisplayAction(eventType: string): string {
  const normalized = eventType.toLowerCase();
  return EVENT_TYPE_TO_ACTION[normalized] ?? normalized;
}

function getDisplayAsset(
  row: EarnTransactionHistoryRow,
  category: OpportunityCategory,
  action: string,
): { amountRaw: string; symbol: string; decimals: number; logo?: string } {
  const hasInputAsset =
    row.inputAssetAmountRaw && row.inputAssetSymbol && typeof row.inputAssetDecimals === 'number';
  const hasOutputAsset =
    row.outputAssetAmountRaw &&
    row.outputAssetSymbol &&
    typeof row.outputAssetDecimals === 'number';

  if (category === OpportunityCategory.Lend) {
    if (action === 'withdraw' && hasOutputAsset) {
      return {
        amountRaw: row.outputAssetAmountRaw!,
        symbol: row.outputAssetSymbol!,
        decimals: row.outputAssetDecimals!,
        logo: row.outputAssetLogo ?? row.assetLogo,
      };
    }

    if (hasInputAsset) {
      return {
        amountRaw: row.inputAssetAmountRaw!,
        symbol: row.inputAssetSymbol!,
        decimals: row.inputAssetDecimals!,
        logo: row.inputAssetLogo ?? row.assetLogo,
      };
    }

    if (hasOutputAsset) {
      return {
        amountRaw: row.outputAssetAmountRaw!,
        symbol: row.outputAssetSymbol!,
        decimals: row.outputAssetDecimals!,
        logo: row.outputAssetLogo ?? row.assetLogo,
      };
    }
  }

  if (category === OpportunityCategory.FixedYield) {
    if (action === 'enter' && hasInputAsset) {
      return {
        amountRaw: row.inputAssetAmountRaw!,
        symbol: row.inputAssetSymbol!,
        decimals: row.inputAssetDecimals!,
        logo: row.inputAssetLogo ?? row.assetLogo,
      };
    }

    if (action === 'exit' && hasOutputAsset) {
      return {
        amountRaw: row.outputAssetAmountRaw!,
        symbol: row.outputAssetSymbol!,
        decimals: row.outputAssetDecimals!,
        logo: row.outputAssetLogo ?? row.assetLogo,
      };
    }
  }

  if (category !== OpportunityCategory.Lend && hasOutputAsset) {
    return {
      amountRaw: row.outputAssetAmountRaw!,
      symbol: row.outputAssetSymbol!,
      decimals: row.outputAssetDecimals!,
      logo: row.outputAssetLogo ?? row.assetLogo,
    };
  }

  return {
    amountRaw: row.assetAmountRaw || '0',
    symbol: row.assetSymbol,
    decimals: row.decimals,
    logo: row.assetLogo,
  };
}

function formatHistoryAmount(displayAsset: {
  amountRaw: string;
  symbol: string;
  decimals: number;
}): string {
  return formatAmount(BigNumber.from(displayAsset.amountRaw || '0'), {
    decimals: displayAsset.decimals,
    symbol: displayAsset.symbol,
  });
}

function getEventTypeDisplay(action: string, displayAsset: { symbol: string }): string {
  return `${action.charAt(0).toUpperCase() + action.slice(1)} ${displayAsset.symbol}`;
}

function TransactionHashLink({
  chainId,
  transactionHash,
  className,
  textClassName,
}: {
  chainId: EarnChainId;
  transactionHash: string;
  className: string;
  textClassName: string;
}) {
  return (
    <ExternalLink
      href={`${getExplorerUrl(chainId)}/tx/${transactionHash}`}
      className={className}
      onClick={(event) => event.stopPropagation()}
    >
      <p className={textClassName} title={transactionHash}>
        {shortenTxHash(transactionHash)}
      </p>
      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-white shrink-0" />
    </ExternalLink>
  );
}

function DesktopHistoryRow({
  row,
  category,
  getDateStr,
  getTimeStr,
  onRowClick,
}: {
  row: EarnTransactionHistoryRow;
  category: OpportunityCategory;
  getDateStr: (timestamp: number) => string;
  getTimeStr: (timestamp: number) => string;
  onRowClick: (row: EarnTransactionHistoryRow) => void;
}) {
  const dateStr = getDateStr(row.timestamp);
  const timeStr = getTimeStr(row.timestamp);
  const action = getDisplayAction(row.eventType);
  const displayAsset = getDisplayAsset(row, category, action);

  return (
    <button
      type="button"
      onClick={() => onRowClick(row)}
      className="group w-full border-none text-left cursor-pointer bg-gray-1 rounded-lg h-[66px] px-4 py-3 flex gap-4 items-center hover:bg-neutral-100 transition-colors"
    >
      <div className="w-[140px] shrink-0 flex flex-col gap-0.5">
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">{timeStr}</p>
        <p className="text-xs text-white opacity-50 leading-none">{dateStr}</p>
      </div>

      <div className="w-[80px] shrink-0">
        <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] capitalize">{action}</p>
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <SafeImage
          src={displayAsset.logo}
          alt={displayAsset.symbol}
          width={24}
          height={24}
          className="rounded-full shrink-0"
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap truncate">
            {formatHistoryAmount(displayAsset)}
          </p>
          <div className="flex items-center gap-1.5">
            <NetworkImage chainId={row.chainId} className="h-3 w-3 shrink-0" />
            <p className="text-xs text-white opacity-50 leading-none whitespace-nowrap">
              {row.chainName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
        <TransactionHashLink
          chainId={row.chainId}
          transactionHash={row.transactionHash}
          className="flex items-center gap-1 opacity-50 hover:opacity-80 transition-opacity min-w-0"
          textClassName="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap font-mono truncate hover:text-white hover:underline"
        />
      </div>

      <div className="bg-white/10 rounded p-2 flex items-center justify-center shrink-0 group-hover:bg-white/20">
        <ChevronRightIcon className="h-4 w-4 text-white" />
      </div>
    </button>
  );
}

function MobileHistoryRow({
  row,
  category,
  onRowClick,
}: {
  row: EarnTransactionHistoryRow;
  category: OpportunityCategory;
  onRowClick: (row: EarnTransactionHistoryRow) => void;
}) {
  const action = getDisplayAction(row.eventType);
  const displayAsset = getDisplayAsset(row, category, action);

  return (
    <button
      type="button"
      onClick={() => onRowClick(row)}
      className="w-full border-none text-left bg-gray-1 rounded-lg h-[78px] px-4 py-4 flex flex-col justify-center gap-0.5 cursor-pointer hover:bg-neutral-100 transition-colors"
    >
      <div className="flex items-center justify-between w-full">
        <p className="text-base text-white leading-[1.15] tracking-[-0.32px] whitespace-nowrap">
          {getEventTypeDisplay(action, displayAsset)}
        </p>
        <TransactionHashLink
          chainId={row.chainId}
          transactionHash={row.transactionHash}
          className="flex items-center gap-1 opacity-50 hover:opacity-80 transition-opacity shrink-0"
          textClassName="text-sm text-white leading-[1.35] tracking-[-0.28px] whitespace-nowrap font-mono hover:text-white hover:underline"
        />
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-[5px]">
          <NetworkImage chainId={row.chainId} className="h-3 w-3 shrink-0" />
          <p className="text-xs text-white opacity-50 leading-normal whitespace-nowrap">
            {row.chainName}
          </p>
        </div>
        <p className="text-sm text-white leading-[1.35] tracking-[-0.28px] whitespace-nowrap">
          {formatHistoryAmount(displayAsset)}
        </p>
      </div>
    </button>
  );
}

export function EarnTransactionHistoryTable({
  category,
  rows,
  getDateStr,
  getTimeStr,
  onRowClick,
  opportunityName,
  protocolName,
  protocolLogo,
}: EarnTransactionHistoryTableProps) {
  const posthog = usePostHog();
  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.timestamp - a.timestamp), [rows]);

  const handleRowClick = useCallback(
    (row: EarnTransactionHistoryRow) => {
      const action = getDisplayAction(row.eventType);
      const displayAsset = getDisplayAsset(row, category, action);
      posthog?.capture('Earn Transaction History Row Clicked', {
        page: 'Earn',
        section: 'Transaction History',
        category,
        action,
        asset: displayAsset.symbol,
        amountRaw: displayAsset.amountRaw,
        chainId: row.chainId,
        chainName: row.chainName,
        transactionHash: row.transactionHash,
        opportunityName,
        protocol: protocolName,
      });

      if (!onRowClick) return;

      const transactionDetails: TransactionDetails = {
        action,
        amount: displayAsset.amountRaw || '0',
        tokenSymbol: displayAsset.symbol,
        decimals: displayAsset.decimals,
        assetLogo: displayAsset.logo,
        txHash: row.transactionHash,
        chainId: row.chainId,
        timestamp: row.timestamp,
        opportunityName: opportunityName || 'Transaction',
        protocolName,
        protocolLogo,
      };

      onRowClick(transactionDetails, true);
    },
    [category, onRowClick, opportunityName, posthog, protocolLogo, protocolName],
  );

  const groupedByDate = useMemo(() => {
    const groups: Record<string, EarnTransactionHistoryRow[]> = {};
    sortedRows.forEach((row) => {
      const normalizedTs = normalizeTimestamp(row.timestamp);
      const dateKey = dayjs(normalizedTs).format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(row);
    });
    return groups;
  }, [sortedRows]);
  const mobileDateGroups = useMemo(
    () => Object.entries(groupedByDate).sort(([dateA], [dateB]) => dateB.localeCompare(dateA)),
    [groupedByDate],
  );

  const getFullDateStr = (timestamp: number) => {
    const normalizedTs = normalizeTimestamp(timestamp);
    return dayjs(normalizedTs).format('MMMM D, YYYY');
  };

  if (sortedRows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <div className="hidden md:flex gap-4 items-center pt-2 px-4 pb-2">
        <div className="w-[140px] shrink-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Date</p>
        </div>
        <div className="w-[80px] shrink-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Type</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Amount</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white opacity-50 whitespace-nowrap">Txn hash</p>
        </div>
        <div className="w-[42px] shrink-0"></div>
      </div>

      <div className="hidden md:flex flex-col gap-1">
        {sortedRows.map((row) => (
          <DesktopHistoryRow
            key={`${row.transactionHash}-${row.timestamp}`}
            row={row}
            category={category}
            getDateStr={getDateStr}
            getTimeStr={getTimeStr}
            onRowClick={handleRowClick}
          />
        ))}
      </div>

      <div className="flex md:hidden flex-col gap-2.5">
        {mobileDateGroups.map(([dateKey, dateRows], groupIndex) => {
          const firstRow = dateRows[0];
          if (!firstRow) return null;
          const fullDateStr = getFullDateStr(firstRow.timestamp);
          const isFirstGroup = groupIndex === 0;

          return (
            <div key={dateKey} className="flex flex-col gap-1">
              <div
                className={twMerge(
                  'flex items-center',
                  isFirstGroup ? 'pb-[5px] pt-4' : 'h-7 py-4',
                )}
              >
                <p className="text-xs text-white opacity-50 leading-none">{fullDateStr}</p>
              </div>

              {dateRows.map((row) => (
                <MobileHistoryRow
                  key={`${row.transactionHash}-${row.timestamp}`}
                  row={row}
                  category={category}
                  onRowClick={handleRowClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

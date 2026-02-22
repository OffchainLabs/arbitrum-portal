'use client';

import { ArrowTopRightOnSquareIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { SafeImage } from '@/bridge/components/common/SafeImage';
import { normalizeTimestamp } from '@/bridge/state/app/utils';
import { shortenAddress } from '@/bridge/util/CommonUtils';
import { formatAmount } from '@/bridge/util/NumberUtils';
import { getExplorerUrl } from '@/bridge/util/networks';
import { ExternalLink } from '@/components/ExternalLink';

import type { TransactionDetails } from './EarnTransactionDetailsPopup';

export interface EarnTransactionHistoryRow {
  timestamp: number;
  eventType: string;
  assetAmountRaw: string;
  assetSymbol: string;
  decimals?: number;
  assetLogo?: string;
  chainId: number;
  chainName: string;
  transactionHash: string;
}

interface EarnTransactionHistoryTableProps {
  rows: EarnTransactionHistoryRow[];
  getDateStr: (timestamp: number) => string;
  getTimeStr: (timestamp: number) => string;
  onRowClick?: (details: TransactionDetails, isCompleted?: boolean) => void;
  opportunityName?: string;
  protocolName?: string;
  protocolLogo?: string;
}

function formatHistoryAmount(row: EarnTransactionHistoryRow): string {
  const rawAmount = row.assetAmountRaw || '0';
  const decimals = row.decimals ?? 18;
  return formatAmount(BigNumber.from(rawAmount), {
    decimals,
    symbol: row.assetSymbol,
  });
}

export function EarnTransactionHistoryTable({
  rows,
  getDateStr,
  getTimeStr,
  onRowClick,
  opportunityName,
  protocolName,
  protocolLogo,
}: EarnTransactionHistoryTableProps) {
  const handleRowClick = (row: EarnTransactionHistoryRow) => {
    if (!onRowClick) return;

    // Map eventType to action (normalize to match TransactionDetails action format)
    const actionMap: Record<string, string> = {
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
    const action = actionMap[row.eventType.toLowerCase()] || row.eventType.toLowerCase();

    const decimals = row.decimals ?? 18;
    const amountRaw = row.assetAmountRaw || '0';

    const transactionDetails: TransactionDetails = {
      action,
      amount: amountRaw,
      tokenSymbol: row.assetSymbol,
      decimals,
      assetLogo: row.assetLogo,
      txHash: row.transactionHash,
      chainId: row.chainId,
      timestamp: row.timestamp,
      opportunityName: opportunityName || 'Transaction',
      protocolName,
      protocolLogo,
    };

    // Mark as completed immediately since this is historical data
    onRowClick(transactionDetails, true);
  };
  // Group transactions by date for mobile view
  const groupedByDate = useMemo(() => {
    const groups: Record<string, EarnTransactionHistoryRow[]> = {};
    rows.forEach((row) => {
      const normalizedTs = normalizeTimestamp(row.timestamp);
      const dateKey = dayjs(normalizedTs).format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(row);
    });
    return groups;
  }, [rows]);

  const getFullDateStr = (timestamp: number) => {
    const normalizedTs = normalizeTimestamp(timestamp);
    return dayjs(normalizedTs).format('MMMM D, YYYY');
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* Desktop Table Header */}
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

      {/* Desktop Table Rows */}
      <div className="hidden md:flex flex-col gap-1">
        {rows.map((row, idx) => {
          const txUrl = `${getExplorerUrl(row.chainId)}/tx/${row.transactionHash}`;
          const dateStr = getDateStr(row.timestamp);
          const timeStr = getTimeStr(row.timestamp);

          return (
            <div
              key={`${row.transactionHash}-${idx}`}
              onClick={() => handleRowClick(row)}
              className="group cursor-pointer bg-gray-1 rounded-[10px] h-[66px] px-4 py-3 flex gap-4 items-center hover:bg-[#2a2a2a] transition-colors"
            >
              {/* Date Column */}
              <div className="w-[140px] shrink-0 flex flex-col gap-0.5">
                <p className="text-sm text-white leading-[1.15] tracking-[-0.28px]">{timeStr}</p>
                <p className="text-xs text-white opacity-50 leading-none">{dateStr}</p>
              </div>

              {/* Type Column */}
              <div className="w-[80px] shrink-0">
                <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] capitalize">
                  {row.eventType}
                </p>
              </div>

              {/* Amount Column */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {row.assetLogo && (
                  <SafeImage
                    src={row.assetLogo}
                    alt={row.assetSymbol}
                    width={24}
                    height={24}
                    className="rounded-full shrink-0"
                  />
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap truncate">
                    {formatHistoryAmount(row)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <SafeImage
                      src="/images/ArbitrumLogo.svg"
                      alt={row.chainName}
                      width={12}
                      height={12}
                      className="shrink-0"
                    />
                    <p className="text-xs text-white opacity-50 leading-none whitespace-nowrap">
                      {row.chainName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Txn Hash Column */}
              <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
                <ExternalLink
                  href={txUrl}
                  className="flex items-center gap-1 opacity-50 hover:opacity-80 transition-opacity min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-sm text-white leading-[1.15] tracking-[-0.28px] whitespace-nowrap font-mono truncate">
                    {shortenAddress(row.transactionHash)}
                  </p>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-white shrink-0" />
                </ExternalLink>
              </div>

              {/* Chevron Button */}
              <div className="bg-white/10 rounded-lg p-2 flex items-center justify-center shrink-0 group-hover:bg-white/20">
                <ChevronRightIcon className="h-4 w-4 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile View */}
      <div className="flex md:hidden flex-col gap-2.5">
        {Object.entries(groupedByDate)
          .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
          .map(([dateKey, dateRows], groupIndex) => {
            const firstRow = dateRows[0];
            if (!firstRow) return null;
            const fullDateStr = getFullDateStr(firstRow.timestamp);
            const isFirstGroup = groupIndex === 0;

            return (
              <div key={dateKey} className="flex flex-col gap-1">
                {/* Date Header */}
                <div
                  className={twMerge(
                    'flex items-center',
                    isFirstGroup ? 'pb-[5px] pt-4' : 'h-7 py-4',
                  )}
                >
                  <p className="text-xs text-white opacity-50 leading-none">{fullDateStr}</p>
                </div>

                {/* Transaction Rows for this date */}
                {dateRows.map((row, idx) => {
                  const txUrl = `${getExplorerUrl(row.chainId)}/tx/${row.transactionHash}`;
                  const eventTypeDisplay = `${row.eventType.charAt(0).toUpperCase() + row.eventType.slice(1)} ${row.assetSymbol}`;

                  return (
                    <div
                      key={`${row.transactionHash}-${idx}`}
                      onClick={() => handleRowClick(row)}
                      className="bg-gray-1 rounded-[10px] h-[78px] px-4 py-4 flex flex-col justify-center gap-0.5 cursor-pointer hover:bg-[#222222] transition-colors"
                    >
                      {/* Top Row: Event Type and Transaction Hash */}
                      <div className="flex items-center justify-between w-full">
                        <p className="text-base text-white leading-[1.15] tracking-[-0.32px] whitespace-nowrap">
                          {eventTypeDisplay}
                        </p>
                        <ExternalLink
                          href={txUrl}
                          className="flex items-center gap-1 opacity-50 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-sm text-white leading-[1.35] tracking-[-0.28px] whitespace-nowrap font-mono">
                            {shortenAddress(row.transactionHash)}
                          </p>
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 text-white shrink-0" />
                        </ExternalLink>
                      </div>

                      {/* Bottom Row: Chain Name and Amount */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-[5px]">
                          <SafeImage
                            src="/images/ArbitrumLogo.svg"
                            alt={row.chainName}
                            width={12}
                            height={12}
                            className="shrink-0"
                          />
                          <p className="text-xs text-white opacity-50 leading-normal whitespace-nowrap">
                            {row.chainName}
                          </p>
                        </div>
                        <p className="text-sm text-white leading-[1.35] tracking-[-0.28px] whitespace-nowrap">
                          {formatHistoryAmount(row)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}

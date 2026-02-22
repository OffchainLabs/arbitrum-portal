'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { useAccount } from 'wagmi';

import { EarnTransactionHistoryTable } from '@/app-components/earn/EarnTransactionHistoryTable';
import { useEarnTransactionHistory } from '@/app-hooks/earn/useEarnTransactionHistory';
import { OpportunityCategory } from '@/app-types/earn/vaults';
import {
  getStandardizedDate,
  getStandardizedTime,
  normalizeTimestamp,
} from '@/bridge/state/app/utils';
import { type EarnNetwork } from '@/earn-api/types';

import { useEarnDialogs } from './EarnDialogsProvider';

function getDateStr(timestamp: number): string {
  if (timestamp === 0) return '';
  return getStandardizedDate(normalizeTimestamp(timestamp));
}

function getTimeStr(timestamp: number): string {
  if (timestamp === 0) return '\u2014';
  return getStandardizedTime(normalizeTimestamp(timestamp));
}

/**
 * Generate page numbers with ellipsis for pagination.
 * Returns an array of page numbers and 'ellipsis' strings.
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

interface EarnUserTransactionHistoryProps {
  category: OpportunityCategory;
  opportunityId: string;
  opportunityName: string;
  network?: EarnNetwork;
  protocolName?: string;
  protocolLogo?: string;
}

const ITEMS_PER_PAGE = 5;

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type TransactionHistoryViewState = 'loading' | 'error' | 'empty' | 'table';

function getViewState(params: {
  isLoading: boolean;
  error: string | null;
  hasTransactions: boolean;
}): TransactionHistoryViewState {
  const { isLoading, error, hasTransactions } = params;
  if (isLoading) {
    return 'loading';
  }
  if (error) {
    return 'error';
  }
  if (!hasTransactions) {
    return 'empty';
  }
  return 'table';
}

function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-center pt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => canGoPrevious && onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="flex items-center justify-center disabled:cursor-not-allowed transition-opacity disabled:opacity-30"
          aria-label="Previous page"
        >
          <ArrowLeftIcon className="h-4 w-4 text-white" />
        </button>

        <div className="flex items-center gap-3">
          {getPageNumbers(currentPage, totalPages).map((page, idx) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-white/50">
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={twMerge(
                  'px-2 py-1 text-sm font-medium transition-colors',
                  isActive ? 'text-white' : 'text-white/50 hover:text-white/70',
                )}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="flex items-center justify-center disabled:cursor-not-allowed transition-opacity disabled:opacity-30"
          aria-label="Next page"
        >
          <ArrowRightIcon className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

/**
 * Unified transaction history component for all earn opportunities (Vaults, Liquid Staking, Pendle)
 */
export function EarnUserTransactionHistory({
  category,
  opportunityId,
  opportunityName,
  network = 'arbitrum',
  protocolName,
  protocolLogo,
}: EarnUserTransactionHistoryProps) {
  const { address: walletAddress } = useAccount();
  const [currentPage, setCurrentPage] = useState(1);
  const { showTransactionDetails } = useEarnDialogs();

  const { transactions, isLoading, error } = useEarnTransactionHistory(
    category,
    opportunityId,
    walletAddress || null,
    network,
  );
  const hasTransactions = transactions.length > 0;

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return transactions.slice(startIndex, endIndex);
  }, [transactions, currentPage]);

  // Keep pagination valid when upstream data changes.
  useEffect(() => {
    if (currentPage !== 1 && (totalPages === 0 || currentPage > totalPages)) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  if (!walletAddress) return null;

  const viewState = getViewState({ isLoading, error, hasTransactions });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center">
        <h3 className="text-[18px] font-medium text-white tracking-[-0.36px]">
          Your transactions for {opportunityName}
        </h3>
      </div>

      {viewState === 'loading' && (
        <div className="flex items-center justify-center py-6 text-white/60 text-sm">
          Loading transactions...
        </div>
      )}

      {viewState === 'error' && <div className="text-xs text-red-400">Failed to load: {error}</div>}

      {viewState === 'empty' && <div className="text-xs text-white/50">No transactions found.</div>}

      {viewState === 'table' && (
        <>
          <EarnTransactionHistoryTable
            rows={paginatedTransactions}
            getDateStr={getDateStr}
            getTimeStr={getTimeStr}
            onRowClick={showTransactionDetails}
            opportunityName={opportunityName}
            protocolName={protocolName}
            protocolLogo={protocolLogo}
          />
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

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
import { type EarnChainId } from '@/earn-api/types';

import type { TransactionDetails } from './EarnTransactionDetailsPopup';
import { TransactionHistoryPlaceholder } from './TransactionHistoryPlaceholder';

function getDateStr(timestamp: number): string {
  if (timestamp === 0) return '';
  return getStandardizedDate(normalizeTimestamp(timestamp));
}

function getTimeStr(timestamp: number): string {
  if (timestamp === 0) return '\u2014';
  return getStandardizedTime(normalizeTimestamp(timestamp));
}

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
  chainId: EarnChainId;
  protocolName?: string;
  protocolLogo?: string;
  onTransactionClick?: (details: TransactionDetails, isCompleted?: boolean) => void;
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
    <nav aria-label="Pagination" className="flex items-center justify-center pt-2">
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            onClick={() => canGoPrevious && onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="flex items-center justify-center disabled:cursor-not-allowed transition-opacity disabled:opacity-30"
            aria-label="Go to previous page"
          >
            <ArrowLeftIcon className="h-4 w-4 text-white" />
          </button>
        </li>

        {getPageNumbers(currentPage, totalPages).map((page, idx) => {
          if (page === 'ellipsis') {
            return (
              <li key={`ellipsis-${idx}`} className="px-2 text-white/50" aria-hidden>
                ...
              </li>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <li key={pageNum}>
              <button
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={twMerge(
                  'px-2 py-1 text-sm font-medium transition-colors',
                  isActive ? 'text-white' : 'text-white/50 hover:text-white/70',
                )}
                aria-label={`Go to page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => canGoNext && onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="flex items-center justify-center disabled:cursor-not-allowed transition-opacity disabled:opacity-30"
            aria-label="Go to next page"
          >
            <ArrowRightIcon className="h-4 w-4 text-white" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function EarnUserTransactionHistory({
  category,
  opportunityId,
  opportunityName,
  chainId,
  protocolName,
  protocolLogo,
  onTransactionClick,
}: EarnUserTransactionHistoryProps) {
  const { address: walletAddress } = useAccount();
  const [currentPage, setCurrentPage] = useState(1);

  const { transactions, isLoading, error } = useEarnTransactionHistory(
    category,
    opportunityId,
    walletAddress || null,
    chainId,
  );
  const hasTransactions = transactions.length > 0;

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return transactions.slice(startIndex, endIndex);
  }, [transactions, currentPage]);

  useEffect(() => {
    if (currentPage !== 1 && (totalPages === 0 || currentPage > totalPages)) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  if (!walletAddress) return null;

  const viewState = getViewState({ isLoading, error, hasTransactions });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h3 className="text-[18px] font-medium text-white tracking-[-0.36px]">
          Your transactions for {opportunityName}
        </h3>
      </div>

      {viewState === 'loading' && <TransactionHistoryPlaceholder />}

      {viewState === 'error' && <div className="text-xs text-red-400">Failed to load: {error}</div>}

      {viewState === 'empty' && <div className="text-xs text-white/50">No transactions found.</div>}

      {viewState === 'table' && (
        <>
          <EarnTransactionHistoryTable
            category={category}
            rows={paginatedTransactions}
            getDateStr={getDateStr}
            getTimeStr={getTimeStr}
            onRowClick={onTransactionClick}
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

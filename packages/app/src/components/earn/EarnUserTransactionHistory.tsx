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

import { initializeDayjs } from '../../initialization';
import { useEarnTransactionDetails } from './EarnTransactionDetailsPopup';

initializeDayjs();

interface EarnUserTransactionHistoryProps {
  category: OpportunityCategory;
  opportunityId: string;
  opportunityName: string;
  network?: string;
  protocolName?: string;
  protocolLogo?: string;
}

const ITEMS_PER_PAGE = 5;

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
  const { showTransactionDetails, EarnTransactionDetailsPopupComponent } =
    useEarnTransactionDetails();

  const { transactions, isLoading, error } = useEarnTransactionHistory(
    category,
    opportunityId,
    walletAddress || null,
    network,
  );

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return transactions.slice(startIndex, endIndex);
  }, [transactions, currentPage]);

  // Reset to page 1 when transactions change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [transactions.length, totalPages, currentPage]);

  const getDateStr = (timestamp: number) => {
    if (timestamp === 0) return '';
    return getStandardizedDate(normalizeTimestamp(timestamp));
  };

  const getTimeStr = (timestamp: number) => {
    if (timestamp === 0) return '—';
    return getStandardizedTime(normalizeTimestamp(timestamp));
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 2) {
        // Show 1, 2, 3, ..., last
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 1) {
        // Show 1, ..., last-2, last-1, last
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show 1, ..., current-1, current, current+1, ..., last
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (!walletAddress) return null;

  return (
    <div className="flex flex-col gap-4">
      <EarnTransactionDetailsPopupComponent />
      {/* Header */}
      <div className="flex items-center">
        <h3 className="text-[18px] font-medium text-white tracking-[-0.36px]">
          Your transactions for {opportunityName}
        </h3>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-white/60 text-sm">
          Loading transactions...
        </div>
      )}

      {error && <div className="text-xs text-red-400">Failed to load: {error}</div>}

      {!isLoading && !error && transactions.length === 0 && (
        <div className="text-xs text-white/50">No transactions found.</div>
      )}

      {!isLoading && !error && transactions.length > 0 && (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center pt-2">
              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* Previous arrow */}
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center disabled:cursor-not-allowed transition-opacity disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ArrowLeftIcon className="h-4 w-4 text-white" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-3">
                  {getPageNumbers().map((page, idx) => {
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
                        onClick={() => handlePageClick(pageNum)}
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

                {/* Next arrow */}
                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center disabled:cursor-not-allowed transition-opacity disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ArrowRightIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

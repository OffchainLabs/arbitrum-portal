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

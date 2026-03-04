'use client';

import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

import { EarnPagination } from '@/app-components/earn/EarnPagination';
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

export function EarnUserTransactionHistory({
  category,
  opportunityId,
  opportunityName,
  chainId,
  protocolName,
  protocolLogo,
  onTransactionClick,
}: EarnUserTransactionHistoryProps) {
  const posthog = usePostHog();
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

  const handlePageChange = useCallback(
    (page: number) => {
      if (page === currentPage) return;
      setCurrentPage(page);
      posthog?.capture('Earn Transaction History Page Changed', {
        page: 'Earn',
        section: 'Transaction History',
        category,
        opportunityId,
        opportunityName,
        chainId,
        currentPage,
        nextPage: page,
        totalPages,
      });
    },
    [category, chainId, currentPage, opportunityId, opportunityName, posthog, totalPages],
  );

  if (!walletAddress) return null;

  const viewState = getViewState({ isLoading, error, hasTransactions });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h3 className="text-[18px] font-medium text-white">
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
          <EarnPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

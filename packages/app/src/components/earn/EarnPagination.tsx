'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { twMerge } from 'tailwind-merge';

interface EarnPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

export function EarnPagination({ currentPage, totalPages, onPageChange }: EarnPaginationProps) {
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

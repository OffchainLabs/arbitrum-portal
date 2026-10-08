import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/app/components/common/Tooltip';

import { TransactionHistoryTable } from './TransactionHistoryTable';

vi.mock('./EmptyTransactionHistory', () => ({
  EmptyTransactionHistory: ({ isError }: { isError: boolean }) => (
    <div data-testid="empty-history">{isError ? 'error' : 'empty'}</div>
  ),
}));

function renderEmptyTable({
  error,
  failedChainPairs,
}: {
  error?: unknown;
  failedChainPairs: { parentChainId: number; childChainId: number }[];
}) {
  render(
    <TooltipProvider>
      <TransactionHistoryTable
        {...({
          transactions: [],
          loading: false,
          completed: true,
          error,
          failedChainPairs,
          resume: vi.fn(),
          updateTransaction: vi.fn(),
          selectedTabIndex: 1,
          oldestTxTimeAgoString: '',
        } as unknown as ComponentProps<typeof TransactionHistoryTable>)}
      />
    </TooltipProvider>,
  );
}

describe.sequential('TransactionHistoryTable empty state', () => {
  afterEach(cleanup);

  it('reports no transactions when every chain was checked', () => {
    renderEmptyTable({ failedChainPairs: [] });

    expect(screen.getByTestId('empty-history').textContent).toBe('empty');
  });

  it('reports a load error when a chain pair failed, even without a fetch error', () => {
    renderEmptyTable({ failedChainPairs: [{ parentChainId: 1, childChainId: 42161 }] });

    expect(screen.getByTestId('empty-history').textContent).toBe('error');
  });

  it('reports a load error on a fetch error', () => {
    renderEmptyTable({ error: new Error('boom'), failedChainPairs: [] });

    expect(screen.getByTestId('empty-history').textContent).toBe('error');
  });
});

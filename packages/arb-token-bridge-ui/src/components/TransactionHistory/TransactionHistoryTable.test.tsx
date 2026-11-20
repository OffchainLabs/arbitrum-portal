import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  failedTxs = [],
}: {
  error?: unknown;
  failedChainPairs: { parentChainId: number; childChainId: number }[];
  failedTxs?: {
    txId: string;
    txChainId: number;
    parentChainId: number;
    childChainId: number;
  }[];
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
          failedTxs,
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
    expect(screen.getByTestId('failed-chain-pairs-warning').getAttribute('aria-label')).toBe(
      'We were unable to fetch data for the following chain pairs: Ethereum to Arbitrum One',
    );
  });

  it('reports a load error when transactions failed to load', () => {
    renderEmptyTable({
      failedChainPairs: [],
      failedTxs: [{ txId: '0xabc', txChainId: 1, parentChainId: 1, childChainId: 42161 }],
    });

    expect(screen.getByTestId('empty-history').textContent).toBe('error');
    expect(screen.getByTestId('failed-chain-pairs-warning').getAttribute('aria-label')).toBe(
      'We were unable to load 1 transaction(s)',
    );
  });

  it('lists failed chain pairs and caps the failed tx hashes', () => {
    const hash = (n: number) => `0x${String(n).padStart(64, '0')}`;
    renderEmptyTable({
      failedChainPairs: [{ parentChainId: 1, childChainId: 42170 }],
      failedTxs: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
        txId: hash(n),
        txChainId: 42161,
        parentChainId: 1,
        childChainId: 42161,
      })),
    });

    fireEvent.click(screen.getByText(/Some transactions couldn't be loaded/));

    expect(screen.getByText(/unable to fetch data for the following chain pairs/)).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: '0x00000...0001' }).getAttribute('href')).toBe(
      `https://arbiscan.io/tx/${hash(1)}`,
    );
    expect(screen.getByText('and 2 more')).toBeTruthy();
  });

  it('reports a load error on a fetch error', () => {
    renderEmptyTable({ error: new Error('boom'), failedChainPairs: [] });

    expect(screen.getByTestId('empty-history').textContent).toBe('error');
  });
});

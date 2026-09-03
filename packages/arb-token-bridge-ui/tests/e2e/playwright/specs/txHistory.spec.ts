/**
 * Transaction history panel.
 * Port of tests/e2e/specs/txHistory.cy.ts.
 */
import { ChainId } from '../../../../src/types/ChainId';
import { expect, test } from '../fixtures';
import {
  login,
  selectTransactionsPanelTab,
  switchToTransactionHistoryTab,
} from '../support/actions';

const DEPOSIT_ROW_IDENTIFIER = /deposit-row-/i;
const CLAIMABLE_ROW_IDENTIFIER = /claimable-row-/i;
const FAILED_CHAIN_PAIRS_WARNING = 'failed-chain-pairs-warning';

const sepoliaLogin = {
  networkType: 'parentChain',
  networkName: 'Sepolia',
  query: { sourceChain: 'sepolia', destinationChain: 'arbitrum-sepolia' },
} as const;

test.describe('Transaction History', () => {
  test('should successfully open and use pending transactions panel', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, sepoliaLogin);

    await switchToTransactionHistoryTab(page, 'pending');
    // retrying locator assertion, not a one-shot `.count()`: the rows are virtualized and the list
    // is still settling right after the tab switch (the Cypress `.should('be.gt', 0)` retried too)
    await expect(page.getByTestId(CLAIMABLE_ROW_IDENTIFIER).first()).toBeVisible();
  });

  test('should successfully open and use settled transactions panel', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, sepoliaLogin);

    await switchToTransactionHistoryTab(page, 'settled');
    await page.getByLabel('Load More Transactions').click();
    // Load More refetches, so the summary is briefly replaced by the loader and the row set is
    // rebuilt. Assert with a retrying locator rather than counting during that window.
    await expect(page.getByTestId(DEPOSIT_ROW_IDENTIFIER).first()).toBeVisible();
  });

  // Arbitrum Sepolia has no subgraph left, so the only thing that can answer here is
  // the indexer. Reading it off the wire rather than trusting the rendered rows: the
  // rows look identical whichever backend served them.
  test('serves Arbitrum Sepolia history from the indexer', async ({ page, e2eEnv }) => {
    const blockNumber = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/chains/${ChainId.ArbitrumSepolia}/block-number`) &&
        response.status() === 200,
    );

    await login(page, e2eEnv, sepoliaLogin);
    await switchToTransactionHistoryTab(page, 'settled');

    const body = await (await blockNumber).json();

    // `l2-arbitrum-sepolia` here would mean the subgraph answered — it no longer
    // exists. `{ data: 0 }` with no `meta` means the chain is missing from
    // NEXT_PUBLIC_INDEXER_CHILD_CHAIN_IDS, so nothing served it.
    expect(body.meta?.source, JSON.stringify(body)).toBe('arbitrum-indexer');
    expect(body.data).toBeGreaterThan(0);

    await expect(page.getByTestId(DEPOSIT_ROW_IDENTIFIER).first()).toBeVisible();
    await expect(page.getByTestId(FAILED_CHAIN_PAIRS_WARNING)).toBeHidden();
  });

  // The contract behind removing the subgraph fallback: an unavailable backend has
  // to say so. The route answers a failure with an empty `data` array of its own, so
  // without the status check this renders as "you have no transactions".
  test('warns instead of showing an empty history when the backend fails', async ({
    page,
    e2eEnv,
  }) => {
    await page.route('**/api/deposits*', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], message: 'Indexer unavailable' }),
      }),
    );

    await login(page, e2eEnv, sepoliaLogin);

    // Not `switchToTransactionHistoryTab`: it waits on the "Showing N transactions"
    // summary, and the point here is what the panel does before/without it.
    await page.getByLabel('Switch to Transaction History Tab').first().click();
    await selectTransactionsPanelTab(page, 'settled');

    const warning = page.getByTestId(FAILED_CHAIN_PAIRS_WARNING);
    await expect(warning).toBeVisible({ timeout: 150_000 });

    await warning.hover();
    await expect(
      page.getByText(/unable to fetch data for the following chain pairs/i),
    ).toBeVisible();
    await expect(page.getByText('Arbitrum Sepolia')).toBeVisible();
  });
});

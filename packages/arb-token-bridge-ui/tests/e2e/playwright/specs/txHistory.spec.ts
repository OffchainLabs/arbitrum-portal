/**
 * Transaction history panel.
 * Port of tests/e2e/specs/txHistory.cy.ts.
 */
import { expect, test } from '../fixtures';
import { login, switchToTransactionHistoryTab } from '../support/actions';

const DEPOSIT_ROW_IDENTIFIER = /deposit-row-/i;
const CLAIMABLE_ROW_IDENTIFIER = /claimable-row-/i;

test.describe('Transaction History', () => {
  test('should successfully open and use pending transactions panel', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, {
      networkType: 'parentChain',
      networkName: 'Sepolia',
      query: { sourceChain: 'sepolia', destinationChain: 'arbitrum-sepolia' },
    });

    await switchToTransactionHistoryTab(page, 'pending');
    // retrying locator assertion, not a one-shot `.count()`: the rows are virtualized and the list
    // is still settling right after the tab switch (the Cypress `.should('be.gt', 0)` retried too)
    await expect(page.getByTestId(CLAIMABLE_ROW_IDENTIFIER).first()).toBeVisible();
  });

  test('should successfully open and use settled transactions panel', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, {
      networkType: 'parentChain',
      networkName: 'Sepolia',
      query: { sourceChain: 'sepolia', destinationChain: 'arbitrum-sepolia' },
    });

    await switchToTransactionHistoryTab(page, 'settled');
    await page.getByLabel('Load More Transactions').click();
    // Load More refetches, so the summary is briefly replaced by the loader and the row set is
    // rebuilt. Assert with a retrying locator rather than counting during that window.
    await expect(page.getByTestId(DEPOSIT_ROW_IDENTIFIER).first()).toBeVisible();
  });
});

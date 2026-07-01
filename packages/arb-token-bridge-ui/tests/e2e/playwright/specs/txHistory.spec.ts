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
    expect(await page.getByTestId(CLAIMABLE_ROW_IDENTIFIER).count()).toBeGreaterThan(0);
  });

  test('should successfully open and use settled transactions panel', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, {
      networkType: 'parentChain',
      networkName: 'Sepolia',
      query: { sourceChain: 'sepolia', destinationChain: 'arbitrum-sepolia' },
    });

    await switchToTransactionHistoryTab(page, 'settled');
    await page.getByLabel('Load More Transactions').click();
    expect(await page.getByTestId(DEPOSIT_ROW_IDENTIFIER).count()).toBeGreaterThan(0);
  });
});

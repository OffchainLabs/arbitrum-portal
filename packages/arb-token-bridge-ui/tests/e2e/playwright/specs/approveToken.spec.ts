/**
 * Approve token for deposit.
 * Port of tests/e2e/specs/approveToken.cy.ts.
 */
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { expect, test } from '../fixtures';
import {
  acceptTnC,
  clickMoveFundsButton,
  confirmSpending,
  findGasFeeSummary,
  findMoveFundsButton,
  findSelectTokenButton,
  importTokenThroughUI,
  login,
  selectRoute,
} from '../support/actions';
import { ERC20TokenName, ERC20TokenSymbol, getZeroToLessThanOneToken } from '../support/common';

const zeroToLessThanOneEth = getZeroToLessThanOneToken('ETH');

test.describe('Approve token for deposit', () => {
  test('should approve and deposit ERC-20 token', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, { networkType: 'parentChain' });
    await importTokenThroughUI(page, e2eEnv, e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string);

    // Select the ERC-20 token
    await expect(page.getByText('Added by User')).toBeVisible();
    await page.getByText(ERC20TokenName).click();

    // token should be selected now and popup should be closed after selection
    await findSelectTokenButton(page, ERC20TokenSymbol);

    await page.getByText('MAX').click();

    await findGasFeeSummary(page, zeroToLessThanOneEth);
    await selectRoute(page, 'arbitrum');

    await acceptTnC(page);

    await expect(await findMoveFundsButton(page)).toBeEnabled({ timeout: 50_000 });
    await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });
    await page.getByText(/pay a one-time approval fee/).click({ timeout: 30_000 });
    await page.getByRole('button', { name: /Pay approval fee of/ }).click();
    await confirmSpending('5');

    /**
     * If confirm spending fails, the test is still considered passing, so add another check to
     * make sure it fails if needed.
     */
    await page.waitForTimeout(25_000);
    await metamask.rejectTransaction();
  });
});

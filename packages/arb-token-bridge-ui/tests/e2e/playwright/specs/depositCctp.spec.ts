/**
 * When user wants to bridge USDC through CCTP from L1 to L2.
 * Port of tests/e2e/specs/depositCctp.cy.ts. Runs under playwright.cctp.config.ts.
 */
import { type Page } from '@playwright/test';
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { CommonAddress } from '../../../../src/util/CommonAddressUtils';
import { expect, test } from '../fixtures';
import {
  acceptTnC,
  claimCctp,
  clickMoveFundsButton,
  confirmSpending,
  findDestinationChainButton,
  findGasFeeSummary,
  findSelectTokenButton,
  findSourceChainButton,
  login,
  searchAndSelectToken,
  typeAmount,
} from '../support/actions';

const USDCAmountToSend = 0.0001;

// common confirm + approve flow for a CCTP deposit
async function confirmAndApproveCctpDeposit(page: Page) {
  // By default, confirm button is disabled
  await expect(page.getByRole('button', { name: /Continue/i })).toBeDisabled();

  const sendSwitch = page.getByRole('switch', { name: /I understand that I'll have to send/i });
  await expect(sendSwitch).toBeVisible();
  await sendSwitch.click();

  const timeSwitch = page.getByRole('switch', { name: /I understand that it will take/i });
  await expect(timeSwitch).toBeVisible();
  await timeSwitch.click();

  const usdceSwitch = page.getByRole('switch', { name: /I understand USDC.e/i });
  await expect(usdceSwitch).toBeVisible();
  await usdceSwitch.click();

  const continueButton = page.getByRole('button', { name: /Continue/i });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await page.getByText(/I understand that I have to/).click();
  await page.getByRole('button', { name: /Pay approval fee of/ }).click();
  console.log('Approving USDC...');
}

test.describe('Deposit USDC through CCTP', () => {
  test.beforeEach(async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, { networkType: 'parentChain', networkName: 'Sepolia' });
    await findSourceChainButton(page, 'Sepolia');
    await findDestinationChainButton(page, 'Arbitrum Sepolia');
    await findSelectTokenButton(page, 'ETH');

    await searchAndSelectToken(page, e2eEnv, {
      tokenName: 'USDC',
      tokenAddress: CommonAddress.Sepolia.USDC,
    });

    await typeAmount(page, USDCAmountToSend);
    await findGasFeeSummary(page, 'N/A');
  });

  test('should initiate depositing USDC to the same address through CCTP successfully', async ({
    page,
  }) => {
    await acceptTnC(page);
    await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });

    await confirmAndApproveCctpDeposit(page);
    await confirmSpending(USDCAmountToSend.toString());

    /**
     * Currently synpress confirmTransaction doesn't work on Sepolia. CCTP confirm flow is tested
     * in withdrawCctp.spec.ts; here we just reject after the (pre-seeded) approval.
     */
    await page.waitForTimeout(40_000);
    await metamask.rejectTransaction();
  });

  test('should claim deposit', async ({ page }) => {
    await claimCctp(page, 0.00014, { accept: false });
    await claimCctp(page, 0.00015, { accept: false });
  });
});

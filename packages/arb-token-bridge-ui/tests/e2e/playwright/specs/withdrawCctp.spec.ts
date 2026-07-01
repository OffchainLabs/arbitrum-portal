/**
 * When user wants to bridge USDC through CCTP from L2 to L1.
 * Port of tests/e2e/specs/withdrawCctp.cy.ts. Runs under playwright.cctp.config.ts.
 */
import { type Page } from '@playwright/test';
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { CommonAddress } from '../../../../src/util/CommonAddressUtils';
import { formatAmount } from '../../../../src/util/NumberUtils';
import { expect, test } from '../fixtures';
import {
  acceptTnC,
  claimCctp,
  clickClaimButton,
  clickMoveFundsButton,
  closeTransactionDetails,
  confirmSpending,
  fillCustomDestinationAddress,
  findDestinationChainButton,
  findGasFeeSummary,
  findSelectTokenButton,
  findSourceChainButton,
  findTransactionDetailsCustomDestinationAddress,
  findTransactionInTransactionHistory,
  login,
  openTransactionDetails,
  searchAndSelectToken,
  selectRoute,
  typeAmount,
} from '../support/actions';

// common confirm + approve flow for a CCTP withdrawal
async function confirmAndApproveCctpWithdrawal(page: Page) {
  await expect(page.getByRole('button', { name: /Continue/i })).toBeDisabled();

  const sendSwitch = page.getByRole('switch', { name: /I understand that I'll have to send/i });
  await expect(sendSwitch).toBeVisible();
  await sendSwitch.click();

  const timeSwitch = page.getByRole('switch', { name: /I understand that it will take/i });
  await expect(timeSwitch).toBeVisible();
  await timeSwitch.click();

  const continueButton = page.getByRole('button', { name: /Continue/i });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await page.getByText(/I understand that I have to/).click();
  await page.getByRole('button', { name: /Pay approval fee of/ }).click();
  console.log('Approving USDC...');
}

test.describe('Withdraw USDC through CCTP', () => {
  test.beforeEach(async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, { networkType: 'childChain', networkName: 'Arbitrum Sepolia' });
    await findSourceChainButton(page, 'Arbitrum Sepolia');
    await findDestinationChainButton(page, 'Sepolia');
    await findSelectTokenButton(page, 'ETH');

    await searchAndSelectToken(page, e2eEnv, {
      tokenName: 'USDC',
      tokenAddress: CommonAddress.ArbitrumSepolia.USDC,
    });
  });

  test('should initiate withdrawing USDC to the same address through CCTP successfully', async ({
    page,
  }) => {
    const USDCAmountToSend = 0.0001;
    await typeAmount(page, USDCAmountToSend);

    await findGasFeeSummary(page, 'N/A');
    await selectRoute(page, 'cctp');
    await acceptTnC(page);
    await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });

    await confirmAndApproveCctpWithdrawal(page);
    await confirmSpending(USDCAmountToSend.toString());

    await page.waitForTimeout(40_000);
    await metamask.confirmTransaction({ gasConfig: 'aggressive' });
    await findTransactionInTransactionHistory(page, { amount: USDCAmountToSend, symbol: 'USDC' });
    await clickClaimButton(page, formatAmount(USDCAmountToSend, { symbol: 'USDC' }));
    await metamask.allowToSwitchNetwork();
    await metamask.rejectTransaction();
    await metamask.changeNetwork('Arbitrum Sepolia');
  });

  test('should claim deposit', async ({ page }) => {
    await metamask.changeNetwork('Sepolia');
    await claimCctp(page, 0.00012, { accept: true });
    await claimCctp(page, 0.00013, { accept: true });
  });

  test('should initiate withdrawing USDC to custom destination address through CCTP successfully', async ({
    page,
    e2eEnv,
  }) => {
    const USDCAmountToSend = 0.00011;
    await typeAmount(page, USDCAmountToSend);

    await findGasFeeSummary(page, 'N/A');
    await fillCustomDestinationAddress(page, e2eEnv);
    await selectRoute(page, 'cctp');
    await acceptTnC(page);
    await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });

    await confirmAndApproveCctpWithdrawal(page);
    await confirmSpending(USDCAmountToSend.toString());

    await page.waitForTimeout(10_000);
    await metamask.confirmTransaction({ gasConfig: 'aggressive' });
    const txData = { amount: USDCAmountToSend, symbol: 'USDC' };
    await findTransactionInTransactionHistory(page, { duration: 'Less than a minute', ...txData });
    await openTransactionDetails(page, txData);
    await findTransactionDetailsCustomDestinationAddress(
      page,
      e2eEnv.CUSTOM_DESTINATION_ADDRESS as string,
    );
    await closeTransactionDetails(page);
    await clickClaimButton(page, formatAmount(USDCAmountToSend, { symbol: 'USDC' }));
    await metamask.allowToSwitchNetwork();
    await metamask.rejectTransaction();
  });
});

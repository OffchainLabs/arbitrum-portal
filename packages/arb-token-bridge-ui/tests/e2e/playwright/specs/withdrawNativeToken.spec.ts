/**
 * When user wants to bridge native token from L2 to L1.
 * Port of tests/e2e/specs/withdrawNativeToken.cy.ts.
 */
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { formatAmount } from '../../../../src/util/NumberUtils';
import { expect, test } from '../fixtures';
import {
  acceptTnC,
  clickClaimButton,
  clickMoveFundsButton,
  closeTransactionDetails,
  fillCustomDestinationAddress,
  findAmountInput,
  findDestinationChainButton,
  findGasFeeSummary,
  findMoveFundsButton,
  findSourceChainButton,
  findTransactionDetailsCustomDestinationAddress,
  findTransactionInTransactionHistory,
  login,
  openTransactionDetails,
  switchToTransactionHistoryTab,
  switchToTransferPanelTab,
  typeAmount,
} from '../support/actions';
import {
  getInitialETHBalance,
  getL1NetworkName,
  getL2NetworkName,
  getZeroToLessThanOneToken,
} from '../support/common';

test.describe('Withdraw native token', () => {
  // shared across the withdraw + claim tests (run serially, single worker)
  let ethToWithdraw = Number((Math.random() * 0.001).toFixed(5));

  test.describe('user has some native token and is on L2', () => {
    test('should show form fields correctly', async ({ page, e2eEnv }) => {
      await login(page, e2eEnv, { networkType: 'childChain' });
      await findSourceChainButton(page, getL2NetworkName(e2eEnv));
      await findDestinationChainButton(page, getL1NetworkName(e2eEnv));
      await expect(await findMoveFundsButton(page)).toBeDisabled();
    });

    test('should show gas estimations', async ({ page, e2eEnv }) => {
      const zeroToLessThanOneNativeToken = getZeroToLessThanOneToken(e2eEnv.NATIVE_TOKEN_SYMBOL);
      await login(page, e2eEnv, { networkType: 'childChain' });
      await typeAmount(page, ethToWithdraw);
      await findGasFeeSummary(page, zeroToLessThanOneNativeToken);
    });

    test('should show withdrawal confirmation and withdraw', async ({ page, e2eEnv }) => {
      ethToWithdraw = Number((Math.random() * 0.001).toFixed(5));
      await login(page, e2eEnv, { networkType: 'childChain' });
      await typeAmount(page, ethToWithdraw);
      await acceptTnC(page);
      await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });

      // the Continue withdrawal button should be disabled at first
      await expect(page.getByRole('button', { name: /Continue/i })).toBeDisabled();

      const beforeSwitch = page.getByRole('switch', { name: /before I can claim my funds/i });
      await expect(beforeSwitch).toBeVisible();
      await beforeSwitch.click();

      const afterSwitch = page.getByRole('switch', { name: /after claiming my funds/i });
      await expect(afterSwitch).toBeVisible();
      await afterSwitch.click();

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await expect(continueButton).toBeEnabled();
      await continueButton.click();

      await metamask.confirmTransaction({ gasConfig: 'aggressive' });

      await findTransactionInTransactionHistory(page, {
        duration: 'Less than a minute',
        amount: ethToWithdraw,
        symbol: e2eEnv.NATIVE_TOKEN_SYMBOL,
      });

      await switchToTransferPanelTab(page);
      await expect(findAmountInput(page)).toHaveValue('');
      await expect(await findMoveFundsButton(page)).toBeDisabled();
    });

    test('should claim funds', async ({ page, e2eEnv }) => {
      // claim button can take ~(20 blocks * 10 blocks/sec) to activate
      const nativeTokenSymbol = e2eEnv.NATIVE_TOKEN_SYMBOL;
      const l1EthBal = formatAmount(
        await getInitialETHBalance(e2eEnv.ETH_RPC_URL, e2eEnv.ADDRESS),
        { symbol: nativeTokenSymbol },
      );

      await login(page, e2eEnv, { networkType: 'parentChain' }); // login to L1 to claim the funds

      await switchToTransactionHistoryTab(page, 'pending');

      await clickClaimButton(page, formatAmount(ethToWithdraw, { symbol: nativeTokenSymbol }));

      await metamask.confirmTransaction({ gasConfig: 'aggressive' });

      const settledTab = page.getByLabel('show settled transactions');
      await expect(settledTab).toBeVisible();
      await settledTab.click();

      await expect(
        page.getByText(formatAmount(ethToWithdraw, { symbol: nativeTokenSymbol })).first(),
      ).toBeVisible();

      await switchToTransferPanelTab(page);

      // the balance on the destination chain should not be the same as before
      const balance = page.getByLabel(`${nativeTokenSymbol} balance amount on parentChain`);
      await expect(balance).toBeVisible();
      await expect(balance).not.toHaveText(l1EthBal);
    });

    test('should withdraw to custom destination address successfully', async ({ page, e2eEnv }) => {
      const amount = Number((Math.random() * 0.001).toFixed(5));

      await login(page, e2eEnv, { networkType: 'childChain' });

      await typeAmount(page, amount);
      await fillCustomDestinationAddress(page, e2eEnv);
      await acceptTnC(page);
      await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });

      await expect(page.getByRole('button', { name: /Continue/i })).toBeDisabled();

      const beforeSwitch = page.getByRole('switch', { name: /before I can claim my funds/i });
      await expect(beforeSwitch).toBeVisible();
      await beforeSwitch.click();

      const afterSwitch = page.getByRole('switch', { name: /after claiming my funds/i });
      await expect(afterSwitch).toBeVisible();
      await afterSwitch.click();

      const continueButton = page.getByRole('button', { name: /Continue/i });
      await expect(continueButton).toBeEnabled();
      await continueButton.click();

      await metamask.confirmTransaction({ gasConfig: 'aggressive' });

      const txData = { amount, symbol: e2eEnv.NATIVE_TOKEN_SYMBOL };
      await findTransactionInTransactionHistory(page, {
        duration: 'Less than a minute',
        ...txData,
      });
      await openTransactionDetails(page, txData);
      await findTransactionDetailsCustomDestinationAddress(
        page,
        e2eEnv.CUSTOM_DESTINATION_ADDRESS as string,
      );

      await closeTransactionDetails(page);
      await switchToTransferPanelTab(page);
      await expect(findAmountInput(page)).toHaveValue('');
      await expect(await findMoveFundsButton(page)).toBeDisabled();
    });
  });
});

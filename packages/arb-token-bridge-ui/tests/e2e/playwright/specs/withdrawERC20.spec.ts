/**
 * When user wants to bridge ERC20 from L2 to L1.
 * Port of tests/e2e/specs/withdrawERC20.cy.ts.
 */
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { formatAmount } from '../../../../src/util/NumberUtils';
import { type E2EConfig } from '../e2eConfig';
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
  findSelectTokenButton,
  findSourceChainButton,
  findTransactionDetailsCustomDestinationAddress,
  findTransactionInTransactionHistory,
  login,
  openTransactionDetails,
  searchAndSelectToken,
  selectRoute,
  switchToTransactionHistoryTab,
  switchToTransferPanelTab,
  typeAmount,
} from '../support/actions';
import {
  ERC20TokenSymbol,
  getInitialERC20Balance,
  getL1NetworkConfig,
  getL1NetworkName,
  getL2NetworkConfig,
  getL2NetworkName,
  getZeroToLessThanOneToken,
} from '../support/common';

const tokenTypes = ['Standard ERC20', 'WETH'] as const;

function getTestCase(e2eEnv: E2EConfig, tokenType: (typeof tokenTypes)[number]) {
  if (tokenType === 'WETH') {
    return {
      symbol: 'WETH',
      l1Address: e2eEnv.L1_WETH_ADDRESS as string,
      l2Address: e2eEnv.L2_WETH_ADDRESS as string,
    };
  }
  return {
    symbol: ERC20TokenSymbol,
    l1Address: e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string,
    l2Address: e2eEnv.ERC20_TOKEN_ADDRESS_CHILD_CHAIN as string,
  };
}

async function clickContinueWithdrawal(page: import('@playwright/test').Page) {
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
}

test.describe('Withdraw ERC20 Token', () => {
  // shared across withdraw + claim tests (run serially, single worker)
  let amountToSend = Number((Math.random() * 0.001).toFixed(5));

  tokenTypes.forEach((tokenType) => {
    test.describe(`User is on L2 and imports ${tokenType}`, () => {
      test('should show form fields correctly', async ({ page, e2eEnv }) => {
        await login(page, e2eEnv, { networkType: 'childChain' });
        await findSourceChainButton(page, getL2NetworkName(e2eEnv));
        await findDestinationChainButton(page, getL1NetworkName(e2eEnv));
        await expect(await findMoveFundsButton(page)).toBeDisabled();
        await findSelectTokenButton(page, e2eEnv.NATIVE_TOKEN_SYMBOL);
      });

      test(`should withdraw ${tokenType} to the same address successfully`, async ({
        page,
        e2eEnv,
      }) => {
        const testCase = getTestCase(e2eEnv, tokenType);
        const zeroToLessThanOneNativeToken = getZeroToLessThanOneToken(e2eEnv.NATIVE_TOKEN_SYMBOL);
        amountToSend = Number((Math.random() * 0.001).toFixed(5));

        await login(page, e2eEnv, { networkType: 'childChain' });
        await searchAndSelectToken(page, e2eEnv, {
          tokenName: testCase.symbol,
          tokenAddress: testCase.l2Address,
        });

        await typeAmount(page, amountToSend);
        await findGasFeeSummary(page, zeroToLessThanOneNativeToken);

        await selectRoute(page, 'arbitrum');
        await acceptTnC(page);
        await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });

        await clickContinueWithdrawal(page);

        await metamask.confirmTransaction({ gasConfig: 'aggressive' });

        await findTransactionInTransactionHistory(page, {
          duration: 'Less than a minute',
          amount: amountToSend,
          symbol: testCase.symbol,
        });

        await switchToTransferPanelTab(page);
        await expect(findAmountInput(page)).toHaveValue('');
        await expect(await findMoveFundsButton(page)).toBeDisabled();
      });

      test('should claim funds', async ({ page, e2eEnv }) => {
        const testCase = getTestCase(e2eEnv, tokenType);
        const l1Erc20Bal = formatAmount(
          (await getInitialERC20Balance({
            tokenAddress: testCase.l1Address,
            multiCallerAddress: getL1NetworkConfig(e2eEnv).multiCall,
            address: e2eEnv.ADDRESS,
            rpcURL: e2eEnv.ETH_RPC_URL,
          }))!,
          { symbol: testCase.symbol },
        );

        await login(page, e2eEnv, { networkType: 'parentChain' }); // login to L1 to claim

        await switchToTransactionHistoryTab(page, 'pending');

        await clickClaimButton(page, formatAmount(amountToSend, { symbol: testCase.symbol }));

        await metamask.confirmTransaction({ gasConfig: 'aggressive' });

        const settledTab = page.getByLabel('show settled transactions');
        await expect(settledTab).toBeVisible();
        await settledTab.click();

        await expect(
          page.getByText(formatAmount(amountToSend, { symbol: testCase.symbol })).first(),
        ).toBeVisible();

        await switchToTransferPanelTab(page);

        await searchAndSelectToken(page, e2eEnv, {
          tokenName: testCase.symbol,
          tokenAddress: testCase.l2Address,
        });

        const parentBalance = page.getByLabel(`${testCase.symbol} balance amount on parentChain`);
        await expect(parentBalance).toBeVisible();
        await expect(parentBalance).not.toHaveText(l1Erc20Bal);
      });

      test(`should withdraw ${tokenType} to custom destination address successfully`, async ({
        page,
        e2eEnv,
      }) => {
        const testCase = getTestCase(e2eEnv, tokenType);
        const zeroToLessThanOneNativeToken = getZeroToLessThanOneToken(e2eEnv.NATIVE_TOKEN_SYMBOL);
        const amount = Number((Math.random() * 0.001).toFixed(5));

        const l2Erc20Bal = formatAmount(
          (await getInitialERC20Balance({
            tokenAddress: testCase.l2Address,
            multiCallerAddress: getL2NetworkConfig(e2eEnv).multiCall,
            address: e2eEnv.ADDRESS,
            rpcURL: e2eEnv.ARB_RPC_URL,
          }))!,
          { symbol: testCase.symbol },
        );

        await login(page, e2eEnv, { networkType: 'childChain' });
        await searchAndSelectToken(page, e2eEnv, {
          tokenName: testCase.symbol,
          tokenAddress: testCase.l2Address,
        });

        await typeAmount(page, amount);
        await findGasFeeSummary(page, zeroToLessThanOneNativeToken);

        await fillCustomDestinationAddress(page, e2eEnv);

        await selectRoute(page, 'arbitrum');
        await acceptTnC(page);
        await clickMoveFundsButton(page, { shouldConfirmInMetamask: false });

        await clickContinueWithdrawal(page);

        await metamask.confirmTransaction({ gasConfig: 'aggressive' });

        const txData = { amount, symbol: testCase.symbol };
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

        const childBalance = page.getByLabel(`${testCase.symbol} balance amount on childChain`);
        await expect(childBalance).toBeVisible();
        await expect(childBalance).not.toHaveText(l2Erc20Bal);

        await expect(findAmountInput(page)).toHaveValue('');
        await expect(await findMoveFundsButton(page)).toBeDisabled();
      });
    });
  });
});

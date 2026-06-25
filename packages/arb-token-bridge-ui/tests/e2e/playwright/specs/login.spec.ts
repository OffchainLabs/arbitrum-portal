/**
 * Playwright port of tests/e2e/specs/login.cy.ts (POC).
 *
 * Verifies the Login and balance check flow under the Playwright runner + Synpress v3
 * Playwright commands, while the Cypress version of this spec stays in place untouched.
 */
import { formatAmount } from '../../../../src/util/NumberUtils';
import { expect, test } from '../fixtures';
import { findDestinationChainButton, findSourceChainButton, login } from '../support/actions';
import {
  getInitialERC20Balance,
  getInitialETHBalance,
  getL1NetworkConfig,
  getL1NetworkName,
  getL2NetworkName,
} from '../support/common';

test.describe('Login Account', () => {
  let l1ETHbal: string;
  let l2ETHbal: string;

  test.beforeAll(async ({ e2eEnv }) => {
    const nativeTokenSymbol = e2eEnv.NATIVE_TOKEN_SYMBOL;
    const nativeTokenDecimals = e2eEnv.NATIVE_TOKEN_DECIMALS;
    const isCustomFeeToken = nativeTokenSymbol !== 'ETH';

    if (isCustomFeeToken) {
      const balance = await getInitialERC20Balance({
        tokenAddress: e2eEnv.NATIVE_TOKEN_ADDRESS as string,
        multiCallerAddress: getL1NetworkConfig(e2eEnv).multiCall,
        address: e2eEnv.ADDRESS,
        rpcURL: e2eEnv.ETH_RPC_URL,
      });
      l1ETHbal = formatAmount(balance!, { decimals: nativeTokenDecimals });
    } else {
      l1ETHbal = formatAmount(await getInitialETHBalance(e2eEnv.ETH_RPC_URL, e2eEnv.ADDRESS));
    }

    l2ETHbal = formatAmount(await getInitialETHBalance(e2eEnv.ARB_RPC_URL, e2eEnv.ADDRESS));
  });

  test('should show connect wallet if not logged in', async ({ page }) => {
    await page.goto('/bridge');
    const connectWallet = page.getByText('Connect Wallet').first();
    await expect(connectWallet).toBeVisible();
    await connectWallet.click();
    await expect(page.getByText('MetaMask')).toBeVisible();
  });

  test('should connect wallet using MetaMask and display L1 and L2 balances', async ({
    page,
    e2eEnv,
  }) => {
    const nativeTokenSymbol = e2eEnv.NATIVE_TOKEN_SYMBOL;

    await login(page, e2eEnv, { networkType: 'parentChain' });

    await expect(
      page.getByLabel(`${nativeTokenSymbol} balance amount on parentChain`),
    ).toContainText(l1ETHbal);
    await expect(
      page.getByLabel(`${nativeTokenSymbol} balance amount on childChain`),
    ).toContainText(l2ETHbal);

    await findSourceChainButton(page, getL1NetworkName(e2eEnv));
    await findDestinationChainButton(page, getL2NetworkName(e2eEnv));
  });
});

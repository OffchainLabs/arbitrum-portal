/**
 * Batch deposit (ERC20 + native currency in one tx).
 * Port of tests/e2e/specs/batchDeposit.cy.ts.
 */
import { formatAmount } from '../../../../src/util/NumberUtils';
import { expect, test } from '../fixtures';
import {
  acceptTnC,
  clickMoveFundsButton,
  closeTransactionDetails,
  fillCustomDestinationAddress,
  findAmount2Input,
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
  selectTransactionsPanelTab,
  switchToTransferPanelTab,
  typeAmount,
  typeAmount2,
} from '../support/actions';
import {
  ERC20TokenSymbol,
  getInitialERC20Balance,
  getInitialETHBalance,
  getL1NetworkConfig,
  getL1NetworkName,
  getL2NetworkConfig,
  getL2NetworkName,
  getZeroToLessThanOneToken,
} from '../support/common';

const zeroToLessThanOneEth = getZeroToLessThanOneToken('ETH');

async function readBalances(e2eEnv: import('../e2eConfig').E2EConfig) {
  const childErc20Balance = formatAmount(
    (await getInitialERC20Balance({
      tokenAddress: e2eEnv.ERC20_TOKEN_ADDRESS_CHILD_CHAIN as string,
      multiCallerAddress: getL2NetworkConfig(e2eEnv).multiCall,
      address: e2eEnv.ADDRESS,
      rpcURL: e2eEnv.ARB_RPC_URL,
    }))!,
  );
  const childNativeTokenBalance = formatAmount(
    await getInitialETHBalance(e2eEnv.ARB_RPC_URL, e2eEnv.ADDRESS),
  );
  const parentErc20Balance = formatAmount(
    (await getInitialERC20Balance({
      tokenAddress: e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string,
      multiCallerAddress: getL1NetworkConfig(e2eEnv).multiCall,
      address: e2eEnv.ADDRESS,
      rpcURL: e2eEnv.ETH_RPC_URL,
    }))!,
  );
  return { childErc20Balance, childNativeTokenBalance, parentErc20Balance };
}

test.describe('Batch Deposit', () => {
  test('should show L1 and L2 chains, and ETH correctly', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, { networkType: 'parentChain', url: '/bridge' });
    await findSourceChainButton(page, getL1NetworkName(e2eEnv));
    await findDestinationChainButton(page, getL2NetworkName(e2eEnv));
    await findSelectTokenButton(page, e2eEnv.NATIVE_TOKEN_SYMBOL);
  });

  test('should deposit erc-20 and native currency to the same address', async ({
    page,
    e2eEnv,
  }) => {
    const amount = Number((Math.random() * 0.001).toFixed(5));
    const nativeCurrencyAmountToSend = 0.002;
    const depositTime = e2eEnv.ORBIT_TEST === '1' ? 'Less than a minute' : '9 minutes';
    const nativeTokenSymbol = e2eEnv.NATIVE_TOKEN_SYMBOL;
    const { childErc20Balance, childNativeTokenBalance, parentErc20Balance } =
      await readBalances(e2eEnv);

    await login(page, e2eEnv, { networkType: 'parentChain' });
    await searchAndSelectToken(page, e2eEnv, {
      tokenName: ERC20TokenSymbol,
      tokenAddress: e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string,
    });

    await expect(
      page.getByLabel(`${ERC20TokenSymbol} balance amount on parentChain`),
    ).toContainText(parentErc20Balance);
    await expect(page.getByLabel(`${ERC20TokenSymbol} balance amount on childChain`)).toContainText(
      childErc20Balance,
    );

    // native currency balance on child chain should not exist yet
    await expect(page.getByLabel(`${nativeTokenSymbol} balance amount on childChain`)).toHaveCount(
      0,
    );
    await expect(findAmount2Input(page)).toHaveCount(0);

    await page.getByLabel('Add native currency button').click();

    await expect(findAmount2Input(page)).toBeVisible();
    await expect(findAmount2Input(page)).toHaveValue('');
    await expect(
      page.getByLabel(`${nativeTokenSymbol} balance amount on childChain`),
    ).toContainText(childNativeTokenBalance);
    await expect(await findMoveFundsButton(page)).toBeDisabled();

    await typeAmount(page, amount);
    await page.waitForTimeout(5_000);
    await typeAmount2(page, nativeCurrencyAmountToSend);
    await findGasFeeSummary(page, zeroToLessThanOneEth);

    const txData = {
      symbol: ERC20TokenSymbol,
      symbol2: nativeTokenSymbol,
      amount,
      amount2: nativeCurrencyAmountToSend,
    };

    await acceptTnC(page);
    await clickMoveFundsButton(page);
    await findTransactionInTransactionHistory(page, { ...txData, duration: depositTime });

    await selectTransactionsPanelTab(page, 'settled');
    await findTransactionInTransactionHistory(page, { duration: 'a few seconds ago', ...txData });
    await switchToTransferPanelTab(page);

    // funds should reach destination account successfully
    const childErc20 = page.getByLabel(`${ERC20TokenSymbol} balance amount on childChain`);
    expect(parseFloat(await childErc20.innerText())).toBeGreaterThan(Number(childErc20Balance));
    const childNative = page.getByLabel(`${nativeTokenSymbol} balance amount on childChain`);
    expect(parseFloat(await childNative.innerText())).toBeGreaterThan(
      Number(childNativeTokenBalance),
    );
    const parentErc20 = page.getByLabel(`${ERC20TokenSymbol} balance amount on parentChain`);
    expect(parseFloat(await parentErc20.innerText())).toBeLessThan(Number(parentErc20Balance));

    await expect(findAmountInput(page)).toHaveValue('');
    await expect(findAmount2Input(page)).toHaveValue('');
    await expect(await findMoveFundsButton(page)).toBeDisabled();
  });

  test('should deposit erc-20 and native currency to a different address', async ({
    page,
    e2eEnv,
  }) => {
    const amount = Number((Math.random() * 0.001).toFixed(5));
    const nativeCurrencyAmountToSend = 0.002;
    const depositTime = e2eEnv.ORBIT_TEST === '1' ? 'Less than a minute' : '9 minutes';
    const nativeTokenSymbol = e2eEnv.NATIVE_TOKEN_SYMBOL;

    await login(page, e2eEnv, { networkType: 'parentChain' });
    await searchAndSelectToken(page, e2eEnv, {
      tokenName: ERC20TokenSymbol,
      tokenAddress: e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string,
    });

    await fillCustomDestinationAddress(page, e2eEnv);

    await expect(findAmount2Input(page)).toHaveCount(0);
    await page.getByLabel('Add native currency button').click();
    await expect(findAmount2Input(page)).toBeVisible();
    await expect(findAmount2Input(page)).toHaveValue('');
    await expect(await findMoveFundsButton(page)).toBeDisabled();

    await typeAmount(page, amount);
    await page.waitForTimeout(5_000);
    await typeAmount2(page, nativeCurrencyAmountToSend);
    await findGasFeeSummary(page, zeroToLessThanOneEth);

    const txData = {
      symbol: ERC20TokenSymbol,
      symbol2: nativeTokenSymbol,
      amount,
      amount2: nativeCurrencyAmountToSend,
    };

    await acceptTnC(page);
    await clickMoveFundsButton(page);
    await findTransactionInTransactionHistory(page, { ...txData, duration: depositTime });
    await openTransactionDetails(page, txData);
    await findTransactionDetailsCustomDestinationAddress(
      page,
      e2eEnv.CUSTOM_DESTINATION_ADDRESS as string,
    );
    await closeTransactionDetails(page);

    await selectTransactionsPanelTab(page, 'settled');
    await findTransactionInTransactionHistory(page, { duration: 'a few seconds ago', ...txData });
    await openTransactionDetails(page, txData);
    await findTransactionDetailsCustomDestinationAddress(
      page,
      e2eEnv.CUSTOM_DESTINATION_ADDRESS as string,
    );
    await closeTransactionDetails(page);
    await switchToTransferPanelTab(page);

    await expect(findAmountInput(page)).toHaveValue('');
    await expect(findAmount2Input(page)).toHaveValue('');
    await expect(await findMoveFundsButton(page)).toBeDisabled();
  });
});

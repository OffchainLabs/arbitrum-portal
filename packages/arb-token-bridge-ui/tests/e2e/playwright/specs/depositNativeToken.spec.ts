/**
 * When user wants to bridge native token from L1 to L2.
 * Port of tests/e2e/specs/depositNativeToken.cy.ts.
 */
import { expect, test } from '../fixtures';
import {
  acceptTnC,
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
  switchToTransferPanelTab,
  typeAmount,
} from '../support/actions';
import { getL1NetworkName, getL2NetworkName, getZeroToLessThanOneToken } from '../support/common';

const zeroToLessThanOneEth = getZeroToLessThanOneToken('ETH');

test.describe('Deposit native token', () => {
  test('should show L1 and L2 chains correctly', async ({ page, e2eEnv }) => {
    await login(page, e2eEnv, { networkType: 'parentChain' });
    await findSourceChainButton(page, getL1NetworkName(e2eEnv));
    await findDestinationChainButton(page, getL2NetworkName(e2eEnv));
  });

  test('should show gas estimations and bridge successfully', async ({ page, e2eEnv }) => {
    const ethAmountToDeposit = Number((Math.random() * 0.001).toFixed(5));
    const depositTime = e2eEnv.ORBIT_TEST === '1' ? 'Less than a minute' : '9 minutes';

    await login(page, e2eEnv, { networkType: 'parentChain' });
    await typeAmount(page, ethAmountToDeposit);
    await findGasFeeSummary(page, zeroToLessThanOneEth);
    await acceptTnC(page);
    await clickMoveFundsButton(page);
    await findTransactionInTransactionHistory(page, {
      duration: depositTime,
      amount: ethAmountToDeposit,
      symbol: e2eEnv.NATIVE_TOKEN_SYMBOL,
    });
    await switchToTransferPanelTab(page);
    await expect(findAmountInput(page)).toHaveValue('');
    await expect(await findMoveFundsButton(page)).toBeDisabled();
  });

  test('should deposit to custom destination address successfully', async ({ page, e2eEnv }) => {
    const ethAmountToDeposit = Number((Math.random() * 0.001).toFixed(5));
    const depositTime = e2eEnv.ORBIT_TEST === '1' ? 'Less than a minute' : '9 minutes';

    await login(page, e2eEnv, { networkType: 'parentChain' });

    await typeAmount(page, ethAmountToDeposit);
    await fillCustomDestinationAddress(page, e2eEnv);

    await findGasFeeSummary(page, zeroToLessThanOneEth);
    await acceptTnC(page);
    await clickMoveFundsButton(page);

    const txData = { amount: ethAmountToDeposit, symbol: e2eEnv.NATIVE_TOKEN_SYMBOL };

    await findTransactionInTransactionHistory(page, { duration: depositTime, ...txData });

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

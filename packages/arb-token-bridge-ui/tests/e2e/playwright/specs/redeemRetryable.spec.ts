/**
 * Redeem a failed retryable ERC20 deposit.
 * Port of tests/e2e/specs/redeemRetryable.cy.ts.
 */
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { AssetType } from '../../../../src/hooks/arbTokenBridge.types';
import { Transaction } from '../../../../src/types/Transactions';
import { formatAmount } from '../../../../src/util/NumberUtils';
import { type E2EConfig } from '../e2eConfig';
import { expect, test } from '../fixtures';
import {
  findTransactionInTransactionHistory,
  login,
  searchAndSelectToken,
  selectTransactionsPanelTab,
  switchToTransactionHistoryTab,
  switchToTransferPanelTab,
} from '../support/actions';
import { getInitialERC20Balance, getL2NetworkConfig } from '../support/common';

const wethAmountToDeposit = 0.001;

function mockErc20RedeemDepositTransaction(e2eEnv: E2EConfig): Transaction {
  const isOrbitTest = e2eEnv.ORBIT_TEST === '1';

  return {
    txID: e2eEnv.REDEEM_RETRYABLE_TEST_TX as string,
    value: wethAmountToDeposit.toString(),
    type: 'deposit-l1',
    direction: 'deposit',
    source: 'local_storage_cache',
    parentChainId: isOrbitTest ? 412346 : 1337,
    childChainId: isOrbitTest ? 333333 : 412346,
    status: 'pending',
    assetName: 'WETH',
    assetType: AssetType.ERC20,
    sender: e2eEnv.ADDRESS,
    destination: e2eEnv.ADDRESS,
    l1NetworkID: isOrbitTest ? '412346' : '1337',
    l2NetworkID: isOrbitTest ? '333333' : '412346',
    timestampCreated: Math.floor(Date.now() / 1000).toString(),
  };
}

test.describe('Redeem ERC20 Deposit', () => {
  test('should redeem failed retryable successfully', async ({ page, e2eEnv }) => {
    const l2WethAddress = e2eEnv.L2_WETH_ADDRESS as string;
    const l2Erc20Bal = formatAmount(
      (await getInitialERC20Balance({
        tokenAddress: l2WethAddress,
        multiCallerAddress: getL2NetworkConfig(e2eEnv).multiCall,
        address: e2eEnv.ADDRESS,
        rpcURL: e2eEnv.ARB_RPC_URL,
      }))!,
    );

    await login(page, e2eEnv, { networkType: 'childChain' });

    await page.evaluate(
      ([key, value]) => {
        localStorage.setItem(key, value);
      },
      [
        `arbitrum:bridge:deposits-${e2eEnv.ADDRESS.toLowerCase()}`,
        JSON.stringify([mockErc20RedeemDepositTransaction(e2eEnv)]),
      ] as [string, string],
    );

    await searchAndSelectToken(page, e2eEnv, { tokenName: 'WETH', tokenAddress: l2WethAddress });

    // check the balance on the destination chain before redeeming
    await expect(page.getByLabel('WETH balance amount on childChain')).toContainText(l2Erc20Bal);

    // open transaction history and wait for deposit to fetch data
    await switchToTransactionHistoryTab(page, 'pending');

    // give CI more time to fetch the transactions
    await page.waitForTimeout(15_000);

    await findTransactionInTransactionHistory(page, {
      amount: wethAmountToDeposit,
      symbol: 'WETH',
    });

    const retryButton = page.getByLabel(/Retry transaction/i).first();
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
    await retryButton.click();

    // approve redeem transaction
    await metamask.confirmTransaction({ gasConfig: 'aggressive' });
    await page.waitForTimeout(15_000);
    await selectTransactionsPanelTab(page, 'settled');

    // find the same transaction redeemed successfully
    await findTransactionInTransactionHistory(page, {
      amount: wethAmountToDeposit,
      symbol: 'WETH',
    });

    await switchToTransferPanelTab(page);

    // wait for the destination balance to update
    await page.waitForTimeout(5_000);
    await expect(page.getByLabel('WETH balance amount on childChain')).toHaveText(
      formatAmount(Number(l2Erc20Bal) + wethAmountToDeposit),
    );
  });
});

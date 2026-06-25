/**
 * When user wants to bridge ERC20 from L1 to L2.
 * Port of tests/e2e/specs/depositERC20.cy.ts.
 */
import { formatAmount } from '../../../../src/util/NumberUtils';
import { type E2EConfig } from '../e2eConfig';
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
} from '../support/actions';
import {
  ERC20TokenSymbol,
  getInitialERC20Balance,
  getL1NetworkConfig,
  getL1NetworkName,
  getL2NetworkName,
  getZeroToLessThanOneToken,
  moreThanZeroBalance,
} from '../support/common';

const tokenTypes = ['Standard ERC20', 'WETH'] as const;
const zeroToLessThanOneEth = getZeroToLessThanOneToken('ETH');

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

test.describe('Deposit Token', () => {
  tokenTypes.forEach((tokenType) => {
    test.describe(`User has some ${tokenType} and is on L1`, () => {
      test('should show L1 and L2 chains, and native token correctly', async ({ page, e2eEnv }) => {
        await login(page, e2eEnv, { networkType: 'parentChain' });
        await findSourceChainButton(page, getL1NetworkName(e2eEnv));
        await findDestinationChainButton(page, getL2NetworkName(e2eEnv));
        await findSelectTokenButton(page, e2eEnv.NATIVE_TOKEN_SYMBOL);
      });

      test(`should deposit ${tokenType} successfully to the same address`, async ({
        page,
        e2eEnv,
      }) => {
        const testCase = getTestCase(e2eEnv, tokenType);
        const depositTime = e2eEnv.ORBIT_TEST === '1' ? 'Less than a minute' : '9 minutes';
        const amount = Number((Math.random() * 0.001).toFixed(5));

        const l1Erc20Bal = formatAmount(
          (await getInitialERC20Balance({
            tokenAddress: testCase.l1Address,
            multiCallerAddress: getL1NetworkConfig(e2eEnv).multiCall,
            address: e2eEnv.ADDRESS,
            rpcURL: e2eEnv.ETH_RPC_URL,
          }))!,
        );

        await login(page, e2eEnv, { networkType: 'parentChain' });
        await searchAndSelectToken(page, e2eEnv, {
          tokenName: testCase.symbol,
          tokenAddress: testCase.l1Address,
        });

        await expect(
          page.getByLabel(`${testCase.symbol} balance amount on parentChain`),
        ).toContainText(l1Erc20Bal);

        await typeAmount(page, amount);
        await findGasFeeSummary(page, zeroToLessThanOneEth);

        await acceptTnC(page);
        await clickMoveFundsButton(page);
        await findTransactionInTransactionHistory(page, {
          duration: depositTime,
          amount,
          symbol: testCase.symbol,
        });

        await switchToTransferPanelTab(page);
        await expect(findAmountInput(page)).toHaveValue('');
        await expect(await findMoveFundsButton(page)).toBeDisabled();
      });

      test('should deposit ERC-20 to custom destination address successfully', async ({
        page,
        e2eEnv,
      }) => {
        const testCase = getTestCase(e2eEnv, tokenType);
        const depositTime = e2eEnv.ORBIT_TEST === '1' ? 'Less than a minute' : '9 minutes';
        const amount = Number((Math.random() * 0.001).toFixed(5));

        const l1Erc20Bal = formatAmount(
          (await getInitialERC20Balance({
            tokenAddress: testCase.l1Address,
            multiCallerAddress: getL1NetworkConfig(e2eEnv).multiCall,
            address: e2eEnv.ADDRESS,
            rpcURL: e2eEnv.ETH_RPC_URL,
          }))!,
        );

        await login(page, e2eEnv, { networkType: 'parentChain' });
        await searchAndSelectToken(page, e2eEnv, {
          tokenName: testCase.symbol,
          tokenAddress: testCase.l1Address,
        });

        await typeAmount(page, amount);
        await findGasFeeSummary(page, zeroToLessThanOneEth);

        await fillCustomDestinationAddress(page, e2eEnv);

        const txData = { amount, symbol: testCase.symbol };

        await acceptTnC(page);
        await clickMoveFundsButton(page);
        await findTransactionInTransactionHistory(page, { duration: depositTime, ...txData });
        await openTransactionDetails(page, txData);
        await findTransactionDetailsCustomDestinationAddress(
          page,
          e2eEnv.CUSTOM_DESTINATION_ADDRESS as string,
        );
        await closeTransactionDetails(page);

        // deposit should complete successfully (settled tab)
        await selectTransactionsPanelTab(page, 'settled');
        await findTransactionInTransactionHistory(page, {
          duration: 'a few seconds ago',
          ...txData,
        });
        await openTransactionDetails(page, txData);
        await findTransactionDetailsCustomDestinationAddress(
          page,
          e2eEnv.CUSTOM_DESTINATION_ADDRESS as string,
        );
        await closeTransactionDetails(page);

        // funds should reach destination account successfully
        await switchToTransferPanelTab(page);
        await expect(
          page.getByLabel(`${testCase.symbol} balance amount on childChain`),
        ).toContainText(moreThanZeroBalance);
        const parentBalance = page.getByLabel(`${testCase.symbol} balance amount on parentChain`);
        await expect(parentBalance).toBeVisible();
        await expect(parentBalance).not.toHaveText(l1Erc20Bal);

        await expect(findAmountInput(page)).toHaveValue('');
        await expect(await findMoveFundsButton(page)).toBeDisabled();
      });
    });
  });
});

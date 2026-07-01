/**
 * User enters the page with query params on the URL.
 * Port of tests/e2e/specs/urlQueryParam.cy.ts.
 */
import { scaleFrom18DecimalsToNativeTokenDecimals } from '@arbitrum/sdk';
import { utils } from 'ethers';

import { formatAmount } from '../../../../src/util/NumberUtils';
import { expect, test } from '../fixtures';
import {
  findAmountInput,
  findSelectTokenButton,
  login,
  visitAfterSomeDelay,
} from '../support/actions';
import {
  getInitialERC20Balance,
  getInitialETHBalance,
  getL1NetworkConfig,
  getNetworkSlug,
} from '../support/common';

test.describe('User enters site with query params on URL', () => {
  test('should correctly populate amount input from query param', async ({ page, e2eEnv }) => {
    test.setTimeout(600_000);

    const nativeTokenSymbol = e2eEnv.NATIVE_TOKEN_SYMBOL;
    const nativeTokenDecimals = e2eEnv.NATIVE_TOKEN_DECIMALS;
    const isCustomFeeToken = nativeTokenSymbol !== 'ETH';

    const balanceBuffer = scaleFrom18DecimalsToNativeTokenDecimals({
      amount: utils.parseEther('0.001'),
      decimals: nativeTokenDecimals,
    });

    const l1ETHbal = isCustomFeeToken
      ? Number(
          formatAmount(
            (await getInitialERC20Balance({
              tokenAddress: e2eEnv.NATIVE_TOKEN_ADDRESS as string,
              multiCallerAddress: getL1NetworkConfig(e2eEnv).multiCall,
              address: e2eEnv.ADDRESS,
              rpcURL: e2eEnv.ETH_RPC_URL,
            }))!,
            { decimals: nativeTokenDecimals },
          ),
        )
      : Number(formatAmount(await getInitialETHBalance(e2eEnv.ETH_RPC_URL, e2eEnv.ADDRESS)));

    const maxBound = Number(l1ETHbal) + Number(balanceBuffer);
    const sourceChain = getNetworkSlug(e2eEnv, 'parent');
    const destinationChain = getNetworkSlug(e2eEnv, 'child');

    await login(page, e2eEnv, { networkType: 'parentChain' });

    const expectMaxAmount = async (amount: string) => {
      await visitAfterSomeDelay(page, '/bridge', {
        qs: { amount, sourceChain, destinationChain },
      });
      await expect(findAmountInput(page)).toBeVisible();
      await expect
        .poll(async () => Number(await findAmountInput(page).inputValue()), { timeout: 30_000 })
        .toBeGreaterThan(0);
      const value = Number(await findAmountInput(page).inputValue());
      expect(value).toBeLessThan(maxBound);
    };

    await expectMaxAmount('max');
    await expectMaxAmount('MAX');
    await expectMaxAmount('MaX');

    const expectExactAmount = async (amount: string, expected: string) => {
      await visitAfterSomeDelay(page, '/bridge', {
        qs: { amount, sourceChain, destinationChain },
      });
      await expect(findAmountInput(page)).toHaveValue(expected);
    };

    await expectExactAmount('56', '56');
    await expectExactAmount('1.6678', '1.6678');
    await expectExactAmount('6', '6');

    await visitAfterSomeDelay(page, '/bridge', {
      qs: { amount: '0.123', sourceChain, destinationChain },
    });
    await expect(page).toHaveURL(/amount=0\.123/);
    await expect(findAmountInput(page)).toHaveValue('0.123');

    await expectExactAmount('-0.123', '0.123');

    await visitAfterSomeDelay(page, '/bridge', {
      qs: { amount: 'asdfs', sourceChain, destinationChain },
    });
    await expect(findAmountInput(page)).toHaveValue('');

    await expectExactAmount('0', '0');
    await expectExactAmount('0.0001', '0.0001');

    await visitAfterSomeDelay(page, '/bridge', {
      qs: { amount: '123,3,43', sourceChain, destinationChain },
    });
    await expect(findAmountInput(page)).toHaveValue('');

    await visitAfterSomeDelay(page, '/bridge', {
      qs: { amount: '0, 123.222, 0.3', sourceChain, destinationChain },
    });
    await expect(findAmountInput(page)).toHaveValue('');
  });

  test('should select token using query params', async ({ page }) => {
    await visitAfterSomeDelay(page, '/bridge', {
      qs: {
        sourceChain: 'sepolia',
        destinationChain: 'arbitrum-sepolia',
        // Arbitrum token on Sepolia
        token: '0xfa898e8d38b008f3bac64dce019a9480d4f06863',
      },
    });

    await findSelectTokenButton(page, 'ARB');
  });
});

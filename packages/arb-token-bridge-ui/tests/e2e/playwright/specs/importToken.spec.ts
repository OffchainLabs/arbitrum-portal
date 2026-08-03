/**
 * Import token (through UI and through URL).
 * Port of tests/e2e/specs/importToken.cy.ts.
 */
import { expect, test } from '../fixtures';
import {
  findSelectTokenButton,
  importTokenThroughUI,
  login,
  visitAfterSomeDelay,
} from '../support/actions';
import { ERC20TokenName, ERC20TokenSymbol, invalidTokenAddress } from '../support/common';

test.describe('Import token', () => {
  test.describe('User import token through UI', () => {
    test('should import token through its L1 address', async ({ page, e2eEnv }) => {
      await login(page, e2eEnv, { networkType: 'parentChain', connectMetamask: false });
      await importTokenThroughUI(page, e2eEnv, e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string);

      await expect(page.getByText('Added by User')).toBeVisible();
      // force click due to an occasional MetaMask window overlap in CI
      await page.getByText(ERC20TokenName).click({ force: true });

      await findSelectTokenButton(page, ERC20TokenSymbol);
    });

    test('should import token through its L2 address', async ({ page, e2eEnv }) => {
      await login(page, e2eEnv, { networkType: 'parentChain', connectMetamask: false });
      await importTokenThroughUI(page, e2eEnv, e2eEnv.ERC20_TOKEN_ADDRESS_CHILD_CHAIN as string);

      await page.getByText(ERC20TokenName).click({ force: true });

      await findSelectTokenButton(page, ERC20TokenSymbol);
    });

    test('should display an error message after invalid input', async ({ page, e2eEnv }) => {
      await login(page, e2eEnv, { networkType: 'parentChain', connectMetamask: false });
      await importTokenThroughUI(page, e2eEnv, invalidTokenAddress);

      await expect(page.getByText('Token not found on this network.')).toBeVisible();
    });

    test('should toggle token list', async ({ page, e2eEnv }) => {
      // we don't have the token list locally so we test on mainnet
      await login(page, e2eEnv, {
        networkType: 'parentChain',
        networkName: 'Ethereum',
        connectMetamask: false,
      });

      await (await findSelectTokenButton(page, 'ETH')).click();

      const manageButton = page.getByRole('button', { name: 'Manage token lists' });
      await manageButton.scrollIntoViewIfNeeded();
      await expect(manageButton).toBeVisible();
      await manageButton.click();

      await page.getByText('Arbed CMC List').scrollIntoViewIfNeeded();
      await expect(page.getByText('Arbed CMC List')).toBeVisible();
      await page.getByLabel('Arbed CMC List').click();
      await expect(page.getByRole('switch', { name: /Arbed CMC List toggle/ })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    test('should import token using token symbol', async ({ page, e2eEnv }) => {
      // we don't have the token list locally so we test on mainnet
      await login(page, e2eEnv, {
        networkType: 'parentChain',
        networkName: 'Ethereum',
        connectMetamask: false,
      });

      const cmcTokenList = page.waitForResponse((r) =>
        r.url().includes('ArbTokenLists/arbed_coinmarketcap.json'),
      );

      await (await findSelectTokenButton(page, 'ETH')).click();

      const manageButton = page.getByRole('button', { name: 'Manage token lists' });
      await manageButton.scrollIntoViewIfNeeded();
      await expect(manageButton).toBeVisible();
      await manageButton.click();

      await page.getByText('Arbed CMC List').scrollIntoViewIfNeeded();
      await expect(page.getByText('Arbed CMC List')).toBeVisible();
      await page.getByLabel('Arbed CMC List').click();
      await expect(page.getByRole('switch', { name: /Arbed CMC List toggle/ })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await cmcTokenList;

      await page.getByRole('button', { name: /Back to Select Token/ }).click();

      // Select the UNI token
      const search = page.getByPlaceholder(/Search by token name/i);
      await expect(search).toBeVisible();
      await search.fill('UNI');

      // the CMC token list loads over the network on mainnet and can be slow
      await page.getByText('Uniswap').click({ timeout: 30_000 });

      await findSelectTokenButton(page, 'UNI');
    });

    test('should disable Add button if address is too long/short', async ({ page, e2eEnv }) => {
      const addressL1 = e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string;
      const addressWithoutLastChar = addressL1.slice(0, -1);

      await login(page, e2eEnv, { networkType: 'parentChain', connectMetamask: false });
      await (await findSelectTokenButton(page, e2eEnv.NATIVE_TOKEN_SYMBOL)).click();

      const search = page.getByPlaceholder(/Search by token name/i);
      await expect(search).toBeVisible();
      await search.fill(addressWithoutLastChar);

      const addButton = page.getByRole('button', { name: 'Add New Token' });
      await expect(addButton).toBeVisible();
      await expect(addButton).toBeDisabled();

      // Add last character -> valid address
      await search.fill(addressL1);
      await expect(addButton).toBeEnabled();

      // One more character -> invalid address
      await search.fill(`${addressL1}x`);
      await expect(addButton).toBeDisabled();
    });
  });

  test.describe('User import token through URL', () => {
    test('should import token through URL using its L1 address', async ({ page, e2eEnv }) => {
      await login(page, e2eEnv, {
        networkType: 'parentChain',
        url: '/bridge',
        query: { token: e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string },
        connectMetamask: false,
      });

      await page.waitForTimeout(3000);

      await expect(page.getByRole('heading', { name: /import unknown token/i })).toBeVisible();
      await expect(page.getByText(new RegExp(ERC20TokenName, 'i'))).toBeVisible();
      await expect(
        page.getByText(new RegExp(e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string, 'i')),
      ).toBeVisible();

      const importButton = page.getByRole('button', { name: 'Import token' });
      await expect(importButton).toBeVisible();
      await importButton.click();
      await findSelectTokenButton(page, ERC20TokenSymbol);

      await expect(page.getByRole('button', { name: 'Import token' })).toHaveCount(0);
    });

    test('should import token through URL using its L2 address', async ({ page, e2eEnv }) => {
      await login(page, e2eEnv, {
        networkType: 'parentChain',
        url: '/bridge',
        query: { token: e2eEnv.ERC20_TOKEN_ADDRESS_CHILD_CHAIN as string },
        connectMetamask: false,
      });

      await page.waitForTimeout(3000);

      await expect(page.getByRole('heading', { name: /import unknown token/i })).toBeVisible();
      await expect(page.getByText(new RegExp(ERC20TokenName, 'i'))).toBeVisible();
      // Modal should always display L1 address regardless of query parameter
      await expect(
        page.getByText(new RegExp(e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string, 'i')),
      ).toBeVisible();

      const importButton = page.getByRole('button', { name: 'Import token' });
      await expect(importButton).toBeVisible();
      await importButton.click({ force: true });
      await findSelectTokenButton(page, ERC20TokenSymbol);

      await expect(page.getByRole('button', { name: 'Import token' })).toHaveCount(0);
    });

    test('should display an error message after invalid URL', async ({ page, e2eEnv }) => {
      await login(page, e2eEnv, {
        networkType: 'parentChain',
        url: '/bridge',
        query: { token: invalidTokenAddress },
        connectMetamask: false,
      });

      await visitAfterSomeDelay(page, '/bridge', {
        qs: {
          sourceChain: 'nitro-testnode-l2',
          destinationChain: 'nitro-testnode-l3',
          token: invalidTokenAddress,
        },
      });

      await expect(page.getByRole('heading', { name: /invalid token address/i })).toBeVisible();
      await expect(
        page.getByText(new RegExp(e2eEnv.ERC20_TOKEN_ADDRESS_PARENT_CHAIN as string, 'i')),
      ).toHaveCount(0);

      await expect(page.getByRole('button', { name: 'Import token' })).toHaveCount(0);
      // Close modal
      const cancelButton = page.getByRole('button', { name: 'Dialog Cancel' });
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();
      await findSelectTokenButton(page, e2eEnv.NATIVE_TOKEN_SYMBOL);

      await expect(page.getByRole('button', { name: 'Dialog Cancel' })).toHaveCount(0);
    });
  });
});

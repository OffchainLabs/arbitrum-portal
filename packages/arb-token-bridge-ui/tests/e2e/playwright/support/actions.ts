/*
 * Playwright port of tests/support/commands.ts (+ the page-based helpers from common.ts).
 *
 * Each Cypress custom command becomes a plain async function taking the Playwright `page` (and
 * the e2e config where the command read `Cypress.env`). MetaMask interactions go through the
 * Synpress v3 Playwright commands. Testing-Library `findBy*` queries map to Playwright's built-in
 * `getBy*` locators.
 *
 * Note: unlike Cypress, Playwright drives a `page` object directly and does not depend on which
 * browser tab is "active", so we don't need the `switchToCypressWindow` dance the Cypress
 * `acceptMetamaskAccess` wrapper used.
 */
import { type Locator, type Page, expect } from '@playwright/test';
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { shortenAddress } from '../../../../src/util/CommonUtils';
import { type E2EConfig } from '../e2eConfig';
import {
  type NetworkName,
  type NetworkType,
  getL1NetworkConfig,
  getL2NetworkConfig,
} from './common';

// Mirrors the Cypress `walletConnectedToDapp` task flag: with a worker-scoped MetaMask context the
// wallet stays connected across tests, so we only run the connect flow on the first login.
let walletConnectedToDapp = false;

// --- element finders -------------------------------------------------------

export function findAmountInput(page: Page): Locator {
  return page.getByLabel('Amount input');
}

export function findAmount2Input(page: Page): Locator {
  return page.getByLabel('Amount2 input');
}

export async function findSourceChainButton(page: Page, chain: string): Promise<Locator> {
  const button = page.getByLabel(`From: ${chain}`);
  await expect(button).toBeVisible();
  return button;
}

export async function findDestinationChainButton(page: Page, chain: string): Promise<Locator> {
  const button = page.getByLabel(`To: ${chain}`);
  await expect(button).toBeVisible();
  return button;
}

export async function findSelectTokenButton(page: Page, text: string): Promise<Locator> {
  const button = page.getByRole('button', { name: 'Select Token' });
  await expect(button).toBeVisible();
  await expect(button).toHaveText(text);
  return button;
}

export async function findMoveFundsButton(page: Page): Promise<Locator> {
  const button = page.getByRole('button', { name: /move funds|select route/i });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  return button;
}

export function findClaimButton(page: Page, amountToClaim: string): Locator {
  return page.getByLabel(`Claim ${amountToClaim}`);
}

// --- typing / amounts ------------------------------------------------------

export async function typeAmount(page: Page, amount: string | number) {
  const input = findAmountInput(page);
  await input.scrollIntoViewIfNeeded();
  await input.fill(String(amount));
}

export async function typeAmount2(page: Page, amount: string | number) {
  const input = findAmount2Input(page);
  await input.scrollIntoViewIfNeeded();
  await input.fill(String(amount));
}

// --- terms / routes / gas --------------------------------------------------

export async function acceptTnC(page: Page) {
  const checkbox = page.getByText(/I have read and agree to the/i);
  await checkbox.scrollIntoViewIfNeeded();
  await expect(checkbox).toBeVisible();
  await checkbox.click();
}

export async function selectRoute(page: Page, type: 'arbitrum' | 'oftV2') {
  const route = page.getByLabel(`Route ${type}`);
  await route.scrollIntoViewIfNeeded();
  await expect(route).toBeVisible();
  await route.click();
}

export async function findGasFeeSummary(page: Page, amount: string | number | RegExp) {
  const text = await page.getByLabel('Route gas').innerText();
  if (amount instanceof RegExp) {
    expect(text).toMatch(amount);
  } else {
    expect(text).toBe(String(amount));
  }
}

// --- token selection -------------------------------------------------------

export async function searchAndSelectToken(
  page: Page,
  cfg: E2EConfig,
  { tokenName, tokenAddress }: { tokenName: string; tokenAddress: string },
) {
  // Click on the native token dropdown (Select token button)
  await (await findSelectTokenButton(page, cfg.NATIVE_TOKEN_SYMBOL ?? 'ETH')).click();

  // open the Select Token popup
  const search = page.getByPlaceholder(/Search by token name/i);
  await search.fill(tokenAddress);
  await expect(search).toBeVisible();

  // Click on the Add new token button
  const addButton = page.getByRole('button', { name: 'Add New Token' });
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Select the token
  await page.getByText(tokenName).first().click();

  // token should be selected now and popup should be closed after selection
  await findSelectTokenButton(page, tokenName);
}

export async function importTokenThroughUI(page: Page, cfg: E2EConfig, address: string) {
  await (await findSelectTokenButton(page, cfg.NATIVE_TOKEN_SYMBOL ?? 'ETH')).click();

  const search = page.getByPlaceholder(/Search by token name/i);
  await expect(search).toBeVisible();
  await search.fill(address);

  const addButton = page.getByRole('button', { name: 'Add New Token' });
  await expect(addButton).toBeVisible();
  await addButton.click();
}

// --- custom destination address -------------------------------------------

export async function fillCustomDestinationAddress(page: Page, cfg: E2EConfig) {
  const toggle = page.getByLabel('Show Custom Destination Address');
  await toggle.scrollIntoViewIfNeeded();
  await expect(toggle).toBeVisible();
  await toggle.click();

  await page.waitForTimeout(1_000);

  const input = page.getByLabel('Custom Destination Address Input');
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeVisible();
  await expect(input).toBeEnabled();
  await input.fill(cfg.CUSTOM_DESTINATION_ADDRESS as string);

  await page.waitForTimeout(1_000);
  await input.blur();
  await page.waitForTimeout(1_000);
}

// --- move funds / metamask confirm ----------------------------------------

export async function clickMoveFundsButton(
  page: Page,
  { shouldConfirmInMetamask = true }: { shouldConfirmInMetamask?: boolean } = {},
) {
  const button = await findMoveFundsButton(page);
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
  if (shouldConfirmInMetamask) {
    await waitForMetamaskNotification(page);
    await metamask.confirmTransaction({
      gasConfig: 'market',
      shouldWaitForPopupClosure: true,
    });
  }
}

async function showsLoadedRequest(popup: Page) {
  if (popup.isClosed() || !popup.url().includes('/notification.html')) {
    return false;
  }
  const confirm = popup.getByTestId('page-container-footer-next');
  try {
    return (await confirm.count()) > 0 && (await confirm.isEnabled());
  } catch {
    return false;
  }
}

/**
 * Waits until MetaMask's popup shows a fully loaded transaction request and returns that popup.
 * Synpress itself only polls for the popup for 10s, and the app estimates gas before asking
 * MetaMask to sign. Confirm stays disabled while MetaMask estimates the fee, and a Reject clicked
 * before then doesn't take: the request comes back and the next confirm sends it instead of that
 * test's own transaction.
 */
export async function waitForMetamaskNotification(page: Page): Promise<Page> {
  let popup: Page | undefined;
  await expect
    .poll(
      async () => {
        const pages = page.context().pages();
        const loaded = await Promise.all(pages.map(showsLoadedRequest));
        popup = pages.find((_, i) => loaded[i]);
        return popup !== undefined;
      },
      { timeout: 60_000 },
    )
    .toBe(true);
  return popup!;
}

/**
 * Rejects MetaMask's pending request. Synpress's rejectTransaction acts on the first popup page it
 * finds, which can be one MetaMask is closing between requests, so click Reject on the popup that
 * shows the loaded request. On L3s MetaMask can also replace that popup with a new one for the
 * same request; a click on a replaced popup rejects nothing, so retry on the new one.
 */
export async function rejectMetamaskRequest(page: Page) {
  await expect(async () => {
    const popup = await waitForMetamaskNotification(page);
    await popup.getByTestId('page-container-footer-cancel').click({ timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
}

/**
 * shouldWaitForPopupClosure flag needs to be set to true for the test to pass.
 */
export async function confirmSpending(spendLimit: string) {
  await metamask.confirmPermissionToSpend({ spendLimit, shouldWaitForPopupClosure: true });
}

// --- transaction history ---------------------------------------------------

export async function selectTransactionsPanelTab(page: Page, tab: 'pending' | 'settled') {
  const tabEl = page.getByRole('tab', { name: `show ${tab} transactions` });
  await expect(tabEl).toBeVisible();
  await tabEl.click();
  await expect(tabEl).toHaveAttribute('data-headlessui-state', /selected/);
}

export async function switchToTransferPanelTab(page: Page) {
  await page.waitForTimeout(1_000);
  await page.getByLabel('Switch to Bridge Tab').first().click();
}

export async function selectTransactionHistoryChain(page: Page, networkName: string) {
  const trigger = page.getByLabel('Filter transaction history by network');
  await trigger.click();

  // the search text persists between popover openings, so drop any previous query
  const search = page.getByLabel('Search networks');
  await search.fill(networkName);

  // the chain name can also appear outside the dropdown (trigger label, history
  // table), so only match rows inside the popover. Skip rows already selected or
  // tagged "included": clicking those would narrow the filter.
  const row = page
    .getByRole('radio', { name: networkName })
    .or(page.getByRole('checkbox', { name: networkName }))
    .first();
  await expect(row).toBeVisible();

  const isChecked = (await row.getAttribute('aria-checked')) === 'true';
  const isIncluded = ((await row.textContent()) ?? '').includes('included');
  if (!isChecked && !isIncluded) {
    await row.click();
  }

  // Close the filter popover so it doesn't cover the table. Escape doesn't reach the popover once
  // a row is clicked, but its trigger toggles it.
  await expect(async () => {
    if (await search.isVisible()) {
      await trigger.click();
    }
    await expect(search).toBeHidden({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

export async function switchToTransactionHistoryTab(
  page: Page,
  tab: 'pending' | 'settled',
  // The history defaults to core chains only; pass the chain under test so
  // seeded or prior-session transactions on a longtail chain are fetched.
  options?: { chainFilter?: string },
) {
  await page.getByLabel('Switch to Transaction History Tab').first().click();

  if (options?.chainFilter) {
    await selectTransactionHistoryChain(page, options.chainFilter);
  }

  await selectTransactionsPanelTab(page, tab);

  await expect(page.getByText(/Showing \d+ \w+ transactions made in/)).toBeVisible({
    timeout: 150_000,
  });
}

export async function findTransactionInTransactionHistory(
  page: Page,
  {
    symbol,
    symbol2,
    amount,
    amount2,
    duration,
  }: {
    symbol: string;
    symbol2?: string;
    amount: number;
    amount2?: number;
    duration?: string;
  },
): Promise<Locator> {
  const timeout = 120_000;

  // Escape RegExp metacharacters (including the backslash itself) so dynamic values are matched
  // literally, e.g. "0.1" matches a literal dot rather than any char.
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parsedAmount = escapeRegex(amount.toString());
  const parsedSymbol = escapeRegex(symbol);
  const parsedAmount2 = typeof amount2 === 'number' ? escapeRegex(amount2.toString()) : undefined;
  const parsedSymbol2 = typeof symbol2 === 'string' ? escapeRegex(symbol2) : undefined;

  const rowId = new RegExp(
    `(claimable|deposit)-row-[0-9xabcdef]*-${parsedAmount}${parsedSymbol}${
      parsedAmount2 && parsedSymbol2 ? `-${parsedAmount2}${parsedSymbol2}` : ''
    }`,
  );

  const row = page.getByTestId(rowId);
  await expect(row).toBeVisible({ timeout });

  if (duration) {
    await expect(row.getByText(duration).first()).toBeVisible({ timeout });
  }

  await expect(row.getByLabel('Transaction details button')).toBeVisible({ timeout });
  return row;
}

/**
 * Testnode deposits settle within seconds, often before the pending tab is read, so look for a
 * deposit in the settled tab.
 */
export async function findSettledTransaction(
  page: Page,
  txData: { symbol: string; symbol2?: string; amount: number; amount2?: number },
): Promise<Locator> {
  await selectTransactionsPanelTab(page, 'settled');
  return findTransactionInTransactionHistory(page, txData);
}

export async function openTransactionDetails(
  page: Page,
  {
    amount,
    amount2,
    symbol,
    symbol2,
  }: { amount: number; amount2?: number; symbol: string; symbol2?: string },
): Promise<Locator> {
  const row = await findTransactionInTransactionHistory(page, { amount, amount2, symbol, symbol2 });
  await row.getByLabel('Transaction details button').click();
  const details = page.getByText('Transaction details');
  await expect(details).toBeVisible();
  return details;
}

export async function closeTransactionDetails(page: Page) {
  // force the click: a transient full-width notification banner can overlap the close button and
  // intercept pointer events. The close button is still the intended target.
  await page.getByLabel('Close transaction details popup').click({ force: true });
}

export async function findTransactionDetailsCustomDestinationAddress(
  page: Page,
  customAddress: string,
): Promise<Locator> {
  await expect(page.getByText(/CUSTOM ADDRESS/i)).toBeVisible();

  // custom destination label in pending tx history should be visible
  const label = page.getByLabel(`Custom address: ${shortenAddress(customAddress)}`);
  await expect(label).toBeVisible();
  return label;
}

export async function clickClaimButton(page: Page, amountToClaim: string) {
  // claim button can take ~(20 blocks * 10 blocks/sec) to activate
  await expect(findClaimButton(page, amountToClaim)).toBeEnabled({ timeout: 200_000 });
  await findClaimButton(page, amountToClaim).click();
  await waitForMetamaskNotification(page);
}

// --- navigation / login ----------------------------------------------------

export async function acceptMetamaskAccess() {
  await metamask.acceptAccess();
}

export async function visit(page: Page, url: string, options?: { qs?: Record<string, string> }) {
  const search = options?.qs ? `?${new URLSearchParams(options.qs).toString()}` : '';
  await page.goto(`${url}${search}`);
}

export async function startWebApp(
  page: Page,
  {
    url = '/bridge',
    query,
    connectMetamask,
  }: {
    url?: string;
    query: Record<string, string>;
    connectMetamask: boolean;
  },
) {
  const search = new URLSearchParams(query).toString();
  await page.goto(`${url}?${search}`);

  // clear local storage for terms to always have it pop up, then reload to apply
  await page.evaluate(() => localStorage.removeItem('arbitrum:bridge:tos-v2'));
  await page.reload();

  if (connectMetamask && !walletConnectedToDapp) {
    const connectWallet = page.getByText('Connect Wallet').first();
    await expect(connectWallet).toBeVisible();
    await connectWallet.click();
    await page.getByText('MetaMask').first().click();
    await acceptMetamaskAccess();
    walletConnectedToDapp = true;
  }
}

export async function login(
  page: Page,
  cfg: E2EConfig,
  {
    networkType,
    networkName,
    url,
    query,
    connectMetamask = true,
  }: {
    networkType: NetworkType;
    networkName?: NetworkName;
    url?: string;
    query?: { [s: string]: string };
    connectMetamask?: boolean;
  },
) {
  // if networkName is not specified we connect to default network from config
  const network = networkType === 'parentChain' ? getL1NetworkConfig(cfg) : getL2NetworkConfig(cfg);
  const networkNameWithDefault = networkName ?? network.networkName;

  const sourceChain = networkNameWithDefault.toLowerCase().replace(/ /g, '-');

  // when testing Orbit chains we want to set destination chain to L3
  const defaultDestinationChain =
    networkType === 'parentChain' && network.chainId === 412346 ? 'nitro-testnode-l3' : '';

  await metamask.changeNetwork(networkNameWithDefault);

  await startWebApp(page, {
    url,
    query: {
      ...query,
      sourceChain,
      destinationChain: query?.destinationChain ?? defaultDestinationChain,
      sanitized: 'true',
    },
    connectMetamask,
  });
}

/*
 * Playwright port of the Cypress custom commands in tests/support/commands.ts that the login
 * POC needs. Each is a plain async function taking the Playwright `page` (and the e2e config)
 * instead of a `cy.*` chainable. MetaMask interactions go through the Synpress v3 Playwright
 * commands (`@synthetixio/synpress/commands/metamask`).
 *
 * Note: unlike Cypress, Playwright drives a `page` object directly and does not depend on which
 * browser tab is "active", so we do not need the `switchToCypressWindow` dance that the Cypress
 * `acceptMetamaskAccess` wrapper used.
 */
import { type Page, expect } from '@playwright/test';
import * as metamask from '@synthetixio/synpress/commands/metamask';

import { type E2EConfig } from '../e2eConfig';
import {
  type NetworkName,
  type NetworkType,
  getL1NetworkConfig,
  getL2NetworkConfig,
} from './common';

export async function findSourceChainButton(page: Page, chain: string) {
  const button = page.getByLabel(`From: ${chain}`);
  await expect(button).toBeVisible();
  return button;
}

export async function findDestinationChainButton(page: Page, chain: string) {
  const button = page.getByLabel(`To: ${chain}`);
  await expect(button).toBeVisible();
  return button;
}

export async function findSelectTokenButton(page: Page, text: string) {
  const button = page.getByRole('button', { name: 'Select Token' });
  await expect(button).toBeVisible();
  await expect(button).toHaveText(text);
  return button;
}

export async function acceptMetamaskAccess() {
  await metamask.acceptAccess();
}

/**
 * Visit the bridge UI with query params and optionally connect MetaMask. Mirrors the Cypress
 * `startWebApp` helper. We clear the terms-of-service flag so the ToS modal always reappears.
 */
export async function startWebApp(
  page: Page,
  {
    query,
    connectMetamask,
  }: {
    query: Record<string, string>;
    connectMetamask: boolean;
  },
) {
  const search = new URLSearchParams(query).toString();
  await page.goto(`/bridge?${search}`);

  // clear local storage for terms to always have it pop up, then reload to apply
  await page.evaluate(() => localStorage.removeItem('arbitrum:bridge:tos-v2'));
  await page.reload();

  const connectWallet = page.getByText('Connect Wallet').first();
  await expect(connectWallet).toBeVisible();

  if (connectMetamask) {
    await connectWallet.click();
    await page.getByText('MetaMask').first().click();
    await acceptMetamaskAccess();
  }
}

/**
 * Visit the bridge UI on a given network, accept MetaMask, and connect. Mirrors the Cypress
 * `login` command.
 */
export async function login(
  page: Page,
  cfg: E2EConfig,
  {
    networkType,
    networkName,
    query,
    connectMetamask = true,
  }: {
    networkType: NetworkType;
    networkName?: NetworkName;
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
    query: {
      ...query,
      sourceChain,
      destinationChain: query?.destinationChain ?? defaultDestinationChain,
      sanitized: 'true',
    },
    connectMetamask,
  });
}

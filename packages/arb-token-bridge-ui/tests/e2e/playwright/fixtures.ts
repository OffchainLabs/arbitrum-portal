/* eslint-disable react-hooks/rules-of-hooks -- `use(...)` here is the Playwright fixture
   callback, not React's `use` hook; the react-hooks rule false-positives on the name. */
/*
 * Playwright + Synpress v3 fixtures.
 *
 * Shape follows docs-v3/e2e-testing/using-with-playwright.md:
 *   - launch a persistent Chromium context with the MetaMask extension loaded
 *   - run `initialSetup` to restore the funded user wallet (we set MetaMask up ourselves
 *     because the suite runs with SKIP_METAMASK_SETUP=true)
 *   - add the local + testnet networks once per context (mirrors tests/support/index.ts)
 *
 * We also add an `e2eEnv` worker fixture that reads the JSON config produced by globalSetup.
 * It is worker-scoped so `test.beforeAll` hooks can use it too. It must NOT be read at module
 * load time, since Playwright collects (imports) spec files before globalSetup runs.
 */
import {
  type BrowserContext,
  test as base,
  expect as baseExpect,
  chromium,
} from '@playwright/test';
import { addNetwork, initialSetup } from '@synthetixio/synpress/commands/metamask';
import { prepareMetamask } from '@synthetixio/synpress/helpers';

import { type E2EConfig, readE2EConfig } from './e2eConfig';
import { getL1NetworkConfig, getL2NetworkConfig } from './support/common';

type TestFixtures = {
  context: BrowserContext;
};

type WorkerFixtures = {
  e2eEnv: E2EConfig;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  e2eEnv: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixtures destructure deps; this one has none
    async ({}, use) => {
      await use(readE2EConfig());
    },
    { scope: 'worker' },
  ],

  context: async ({ e2eEnv }, use) => {
    // Synpress reads a global `expect`
    Object.assign(globalThis, { expect: baseExpect });

    // Download / locate the MetaMask extension. We MUST pin the version: passing undefined
    // makes Synpress download the *latest* MetaMask, whose UI selectors (e.g. the add-network
    // form) no longer match Synpress 3.7.3's automation. 11.15.0 is the version Synpress 3.7.3's
    // own Cypress plugin defaults to (see @synthetixio/synpress/plugins/index.js).
    const metamaskPath = await prepareMetamask(process.env.METAMASK_VERSION || '11.15.0');

    const browserArgs = [
      `--disable-extensions-except=${metamaskPath}`,
      `--load-extension=${metamaskPath}`,
      '--remote-debugging-port=9222',
    ];
    if (process.env.CI) {
      browserArgs.push('--disable-gpu');
    }
    if (process.env.HEADLESS_MODE) {
      browserArgs.push('--headless=new');
    }

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: browserArgs,
    });

    // Wait for the MetaMask window to show up
    const [firstPage] = context.pages();
    await firstPage?.waitForTimeout(3000);

    // Restore the funded user wallet, starting on sepolia to avoid connecting to localhost twice
    await initialSetup(chromium, {
      secretWordsOrPrivateKey: e2eEnv.PRIVATE_KEY,
      network: 'sepolia',
      password: 'Tester@1234',
      enableAdvancedSettings: true,
    });

    // Add the local networks the login flow uses (mirrors the Cypress `before()` in
    // tests/support/index.ts). Locally MetaMask already has a localhost network, so we only add
    // the local L1 when its RPC differs from MetaMask's default localhost.
    //
    // The Cypress hook also adds Sepolia + Arbitrum Sepolia, but the login POC never switches to
    // them, and adding Sepolia via an Infura RPC without a valid key triggers a browser auth
    // dialog that hangs MetaMask's add-network flow. Those testnet networks belong to the
    // tx-history / CCTP specs and will be added back (with a valid Sepolia RPC) in Phase 1.
    if (e2eEnv.ETH_RPC_URL !== 'http://localhost:8545') {
      await addNetwork(getL1NetworkConfig(e2eEnv));
    }
    await addNetwork(getL2NetworkConfig(e2eEnv));

    await use(context);

    await context.close();
  },
});

export const expect = test.expect;

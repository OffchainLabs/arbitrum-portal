/* eslint-disable react-hooks/rules-of-hooks -- `use(...)` here is the Playwright fixture
   callback, not React's `use` hook; the react-hooks rule false-positives on the name. */
/*
 * Playwright + Synpress v3 fixtures.
 *
 * Shape follows docs-v3/e2e-testing/using-with-playwright.md:
 *   - launch a persistent Chromium context with the MetaMask extension loaded
 *   - run `initialSetup` to restore the funded user wallet (we set MetaMask up ourselves
 *     because the suite runs with SKIP_METAMASK_SETUP=true)
 *   - add the networks the specs use (mirrors tests/support/index.ts)
 *
 * The `context` fixture is WORKER-scoped: MetaMask is set up once per worker (not per test),
 * which is the main speed win over the naive per-test setup. With a single worker the whole run
 * shares one MetaMask, matching Cypress's `testIsolation: false`. Each test still gets a fresh
 * `page` (tab) in that shared context.
 *
 * The `e2eEnv` worker fixture reads the JSON config produced by globalSetup. It must NOT be read
 * at module load time, since Playwright imports spec files before globalSetup runs.
 */
import {
  type BrowserContext,
  type Page,
  test as base,
  expect as baseExpect,
  chromium,
} from '@playwright/test';
import { addNetwork, initialSetup } from '@synthetixio/synpress/commands/metamask';
import { prepareMetamask } from '@synthetixio/synpress/helpers';
import fs from 'fs';
import path from 'path';

import { config as packageConfig } from '../../../../../package.json';
import { type E2EConfig, readE2EConfig } from './e2eConfig';
import {
  getL1NetworkConfig,
  getL1TestnetNetworkConfig,
  getL2NetworkConfig,
  getL2TestnetNetworkConfig,
} from './support/common';

// MetaMask 11.15.0 is a Manifest V2 extension, which Playwright's bundled (newer) Chromium refuses
// to load ("unsupported manifest version"). Reuse the Chrome for Testing pinned by the root
// `install:chromium` script (Chrome 128 still supports MV2), matching the browser the
// Cypress/Synpress suite used. See the migration plan (decision #4) and the old browser.config.ts.
function getPinnedChromePath(): string {
  const workspaceRoot = path.resolve(__dirname, '../../../../..');
  const chromeDir = path.join(workspaceRoot, packageConfig.chromePath, 'chrome');
  const executablePath =
    process.platform === 'darwin'
      ? path.join(
          chromeDir,
          `mac_arm-${packageConfig.chromeVersion}`,
          'chrome-mac-arm64',
          'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
        )
      : path.join(chromeDir, `linux-${packageConfig.chromeVersion}`, 'chrome-linux64', 'chrome');

  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `Pinned Chrome for Testing not found at ${executablePath}. ` +
        `Run \`pnpm run install:chromium\` (or \`pnpm install\`) to download Chrome ` +
        `${packageConfig.chromeVersion}.`,
    );
  }

  return executablePath;
}

type WorkerFixtures = {
  e2eEnv: E2EConfig;
  // Our own worker-scoped persistent context (Playwright's built-in `context` is test-scoped and
  // cannot be redefined to worker scope, so we use a distinct name).
  mmContext: BrowserContext;
};

type TestFixtures = {
  page: Page;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  e2eEnv: [
    async ({}, use) => {
      await use(readE2EConfig());
    },
    { scope: 'worker' },
  ],

  mmContext: [
    async ({ e2eEnv }, use) => {
      // Synpress reads a global `expect`
      Object.assign(globalThis, { expect: baseExpect });

      // Download / locate the MetaMask extension. We MUST pin the version: passing undefined makes
      // Synpress download the *latest* MetaMask, whose UI selectors (e.g. the add-network form) no
      // longer match Synpress 3.7.3's automation. 11.15.0 is the version Synpress 3.7.3's own
      // Cypress plugin defaults to (see @synthetixio/synpress/plugins/index.js).
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
        executablePath: getPinnedChromePath(),
        args: browserArgs,
      });

      // Wait for the MetaMask window to show up
      const [firstPage] = context.pages();
      await firstPage?.waitForTimeout(3000);

      // Restore the funded wallet, starting on sepolia to avoid connecting to localhost twice
      await initialSetup(chromium, {
        secretWordsOrPrivateKey: e2eEnv.PRIVATE_KEY,
        network: 'sepolia',
        password: 'Tester@1234',
        enableAdvancedSettings: true,
      });

      // Add the networks the specs use (mirrors the Cypress `before()` in tests/support/index.ts).
      // CCTP runs only on the public testnets; the regular/orbit suite also needs the local chains.
      if (!e2eEnv.IS_CCTP) {
        // Locally MetaMask already has a localhost network, so we only add L1 in CI.
        if (e2eEnv.ETH_RPC_URL !== 'http://localhost:8545') {
          await addNetwork(getL1NetworkConfig(e2eEnv));
        }
        await addNetwork(getL2NetworkConfig(e2eEnv));
      }
      await addNetwork(getL1TestnetNetworkConfig(e2eEnv));
      await addNetwork(getL2TestnetNetworkConfig(e2eEnv));

      await use(context);

      await context.close();
    },
    { scope: 'worker' },
  ],

  // Fresh page (tab) per test, in the shared worker-scoped MetaMask context.
  page: async ({ mmContext }, use) => {
    const page = await mmContext.newPage();
    await use(page);
    await page.close();
  },
});

export const expect = test.expect;

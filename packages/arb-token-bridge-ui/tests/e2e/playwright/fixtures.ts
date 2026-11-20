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
 * The `e2eEnv` worker fixture reads the config produced by globalSetup. It must NOT be read at
 * module load time, since Playwright imports spec files before globalSetup runs.
 */
import {
  type BrowserContext,
  type Page,
  test as base,
  expect as baseExpect,
  chromium,
} from '@playwright/test';
import { addNetwork, initialSetup } from '@synthetixio/synpress/commands/metamask';
import {
  prepareMetamask,
  addNetwork as registerSynpressNetwork,
  setNetwork as setSynpressNetwork,
} from '@synthetixio/synpress/helpers';
import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
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
// Cypress/Synpress suite used.
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

const METAMASK_SNAPSHOT_MARKER = 'e2e-metamask-snapshot';

// The MetaMask vault holds the user wallet's private key. CI caches profiles, and forks can read a
// repo's caches, so the vault password comes from that secret key rather than a public constant.
function getMetamaskPassword(e2eEnv: E2EConfig) {
  return `Aa1!${createHash('sha256').update(e2eEnv.PRIVATE_KEY).digest('hex').slice(0, 32)}`;
}

// Chrome names an unpacked extension after its path: the first 32 hex digits of the path's
// SHA-256, with 0-f mapped to a-p.
function getUnpackedExtensionId(extensionPath: string) {
  return createHash('sha256')
    .update(path.resolve(extensionPath))
    .digest('hex')
    .slice(0, 32)
    .replace(/[0-9a-f]/g, (c) => String.fromCharCode(97 + parseInt(c, 16)));
}

async function waitForMetamaskPage(context: BrowserContext) {
  await baseExpect
    .poll(() => context.pages().some((p) => p.url().startsWith('chrome-extension://')), {
      timeout: 30_000,
    })
    .toBe(true);
}

// The networks the specs use (mirrors the Cypress `before()` in tests/support/index.ts). Locally
// MetaMask already has a localhost network, so we only add L1 in CI.
function getMetamaskNetworks(e2eEnv: E2EConfig) {
  return [
    ...(e2eEnv.ETH_RPC_URL !== 'http://localhost:8545' ? [getL1NetworkConfig(e2eEnv)] : []),
    getL2NetworkConfig(e2eEnv),
    getL1TestnetNetworkConfig(e2eEnv),
    getL2TestnetNetworkConfig(e2eEnv),
  ];
}

// Restores the funded wallet and adds the networks the specs use.
async function setUpMetamask(e2eEnv: E2EConfig) {
  // start on sepolia to avoid connecting to localhost twice
  await initialSetup(chromium, {
    secretWordsOrPrivateKey: e2eEnv.PRIVATE_KEY,
    network: 'sepolia',
    password: getMetamaskPassword(e2eEnv),
    enableAdvancedSettings: true,
  });

  for (const network of getMetamaskNetworks(e2eEnv)) {
    // eslint-disable-next-line no-await-in-loop -- MetaMask's add-network form takes one at a time
    await addNetwork(network);
  }
}

// Synpress only switches to networks it added itself, which it tracks in memory. A snapshot's
// MetaMask already has them, so list them with Synpress the way its addNetwork does, minus the UI.
function registerSnapshotNetworks(e2eEnv: E2EConfig) {
  let lastNetwork: object | undefined;
  for (const network of getMetamaskNetworks(e2eEnv)) {
    lastNetwork = {
      id: network.chainId,
      name: network.networkName,
      nativeCurrency: { symbol: network.symbol },
      rpcUrls: { public: { http: [network.rpcUrl] }, default: { http: [network.rpcUrl] } },
      testnet: network.isTestnet,
    };
    registerSynpressNetwork(lastNetwork);
  }
  // MetaMask switches to each network it adds, so the snapshot is on the last one. Synpress
  // otherwise assumes mainnet and skips a switch to mainnet as already done.
  setSynpressNetwork(lastNetwork);
}

const APP_URL = 'http://127.0.0.1:3000';

async function waitForApp(timeoutMs = 600_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // eslint-disable-next-line no-await-in-loop -- polling
      const response = await fetch(APP_URL);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    // eslint-disable-next-line no-await-in-loop -- polling
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The app at ${APP_URL} did not start within ${timeoutMs / 1000}s`);
}

// What a snapshot depends on: the wallet and the networks setUpMetamask adds.
function metamaskSnapshotKey(e2eEnv: E2EConfig) {
  return JSON.stringify([e2eEnv.ADDRESS, getMetamaskNetworks(e2eEnv)]);
}

function isMetamaskSnapshotReady(snapshotDir: string, e2eEnv: E2EConfig) {
  const marker = path.join(snapshotDir, METAMASK_SNAPSHOT_MARKER);
  return fs.existsSync(marker) && fs.readFileSync(marker, 'utf8') === metamaskSnapshotKey(e2eEnv);
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
      if (process.env.HEADLESS_MODE === 'true') {
        browserArgs.push('--headless=new');
      }

      const launch = (userDataDir: string) =>
        chromium.launchPersistentContext(userDataDir, {
          headless: false,
          executablePath: getPinnedChromePath(),
          args: browserArgs,
          // Matches the Cypress suite's 1366x850. Playwright defaults to 1280x720, and the shorter
          // viewport renders ~2 fewer rows of the virtualized transaction history table -- rows
          // outside the rendered window are absent from the DOM, so
          // `findTransactionInTransactionHistory` can miss a row entirely. Note `use.viewport` in
          // playwright.config.ts does NOT reach this context, since we build it ourselves rather
          // than letting Playwright create it.
          viewport: { width: 1366, height: 850 },
        });

      // A MetaMask profile saved right after setup, before any transaction (MetaMask derives nonces
      // from its own tx history, so a profile saved later would carry nonces from a previous
      // chain). The first run creates it, later runs copy it and only unlock MetaMask.
      const snapshotDir = process.env.E2E_METAMASK_PROFILE;
      if (snapshotDir && !isMetamaskSnapshotReady(snapshotDir, e2eEnv)) {
        fs.rmSync(snapshotDir, { recursive: true, force: true });
        const setupContext = await launch(snapshotDir);
        await waitForMetamaskPage(setupContext);
        await setUpMetamask(e2eEnv);
        // MetaMask writes its state to disk on a debounce, so give the last network time to land
        // before closing. This runs once per snapshot.
        await setupContext.pages()[0]?.waitForTimeout(5_000);
        await setupContext.close();
        fs.writeFileSync(
          path.join(snapshotDir, METAMASK_SNAPSHOT_MARKER),
          metamaskSnapshotKey(e2eEnv),
        );
      }

      let context: BrowserContext;
      if (snapshotDir) {
        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-metamask-'));
        fs.cpSync(snapshotDir, userDataDir, { recursive: true });
        context = await launch(userDataDir);
        // An existing profile opens no MetaMask tab, and Synpress looks for one
        const metamaskHome = await context.newPage();
        await metamaskHome.goto(
          `chrome-extension://${getUnpackedExtensionId(metamaskPath)}/home.html`,
        );
        // Every few days MetaMask 11 shows a "Protect your funds" backup reminder whose backdrop
        // blocks the account menu Synpress clicks. Unlock and dismiss it first; MetaMask then
        // stops showing it, and Synpress carries on with an unlocked wallet.
        await metamaskHome
          .locator('[data-testid="unlock-page"] #password')
          .fill(getMetamaskPassword(e2eEnv));
        await metamaskHome.locator('[data-testid="unlock-page"] .btn-default').click();
        await metamaskHome.locator('[data-testid=account-options-menu-button]').waitFor();
        await metamaskHome
          .getByRole('button', { name: 'Got it' })
          .click({ timeout: 2_000 })
          .catch(() => {});
        await initialSetup(chromium, {
          secretWordsOrPrivateKey: e2eEnv.PRIVATE_KEY,
          network: 'sepolia',
          password: getMetamaskPassword(e2eEnv),
        });
        registerSnapshotNetworks(e2eEnv);
      } else {
        context = await launch('');
        await waitForMetamaskPage(context);
        await setUpMetamask(e2eEnv);
      }

      // CI starts Playwright while the app is still being built and started, so MetaMask setup
      // overlaps the build. Wait for the app before the first test.
      if (process.env.E2E_WAIT_FOR_APP === 'true') {
        await waitForApp();
      }

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

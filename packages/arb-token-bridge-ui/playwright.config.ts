import { defineConfig } from '@playwright/test';

/**
 * Playwright runner config for the bridge e2e suite (Synpress v3 Playwright plugin).
 *
 * This lives alongside the Cypress setup (synpress.config.ts) during the Cypress -> Playwright
 * migration. See CYPRESS_TO_PLAYWRIGHT_MIGRATION_PLAN.md.
 *
 * MetaMask requires a single shared persistent browser context, so we run serially with one
 * worker. globalSetup performs on-chain prep and writes the e2e config the specs read.
 */
export default defineConfig({
  testDir: './tests/e2e/playwright/specs',
  // CCTP runs on a different setup (testnets, funded random wallet); it has its own config.
  testIgnore: '**/*Cctp.spec.ts',
  globalSetup: './tests/e2e/playwright/globalSetup',
  // Overall per-test ceiling, not a per-assertion timeout: MetaMask automation is slow, so give
  // specs room to complete all their steps. Long individual waits (e.g. claim button activation)
  // still need an explicit `{ timeout }` on that assertion, since expect.timeout below applies otherwise.
  timeout: 300_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  workers: 1,
  // matches the Cypress suite's `retries: 2` (skipped when recording video)
  retries: process.env.RECORD_VIDEO === 'true' ? 0 : 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.RECORD_VIDEO === 'true' ? 'on' : 'off',
  },
});

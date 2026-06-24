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
  globalSetup: './tests/e2e/playwright/globalSetup',
  // MetaMask automation is slow; give specs room.
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CYPRESS_RECORD_VIDEO === 'true' ? 'on' : 'off',
  },
});

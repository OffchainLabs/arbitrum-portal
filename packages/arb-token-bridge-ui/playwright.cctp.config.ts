import { defineConfig } from '@playwright/test';

/**
 * Playwright config for the CCTP e2e suite (port of synpress.cctp.config.ts).
 *
 * CCTP runs on the public Sepolia / Arbitrum Sepolia testnets and has its own globalSetup that
 * funds a fresh wallet and pre-creates CCTP burn transactions. Running CCTP specs in parallel
 * causes nonce issues, so we run them serially with a single worker.
 */
export default defineConfig({
  testDir: './tests/e2e/playwright/specs',
  testMatch: '**/*Cctp.spec.ts',
  globalSetup: './tests/e2e/playwright/globalSetup.cctp',
  timeout: 300_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  workers: 1,
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

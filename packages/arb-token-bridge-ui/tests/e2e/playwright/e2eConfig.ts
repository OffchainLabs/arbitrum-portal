/*
 * Shared e2e config for the Playwright runner.
 *
 * Playwright's `globalSetup` runs in a separate process from the test workers, so values
 * produced during setup (wallet keys, RPC urls, token info) cannot be shared in memory the
 * way Cypress passes them through `config.env`. Instead globalSetup writes them to a JSON
 * file and the `e2eEnv` fixture reads it back. This is the Playwright replacement for
 * `Cypress.env(...)`.
 */
import fs from 'fs';
import path from 'path';

export type E2EConfig = {
  ETH_RPC_URL: string;
  ARB_RPC_URL: string;
  ETH_SEPOLIA_RPC_URL: string;
  ARB_SEPOLIA_RPC_URL: string;
  ADDRESS: string;
  PRIVATE_KEY: string;
  INFURA_KEY?: string;
  ORBIT_TEST: '0' | '1';
  NATIVE_TOKEN_SYMBOL: string;
  NATIVE_TOKEN_ADDRESS?: string;
  NATIVE_TOKEN_DECIMALS: number;
};

// Written by globalSetup, read by the `e2eEnv` fixture. Gitignored.
const CONFIG_PATH = path.join(__dirname, '.e2e-config.json');

export function writeE2EConfig(config: E2EConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function readE2EConfig(): E2EConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `E2E config not found at ${CONFIG_PATH}. Did Playwright globalSetup run? ` +
        `Run via the test:e2e:pw script so globalSetup writes the config first.`,
    );
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as E2EConfig;
}

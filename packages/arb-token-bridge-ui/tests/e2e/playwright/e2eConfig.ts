/*
 * Shared e2e config for the Playwright runner.
 *
 * This is the Playwright replacement for `Cypress.env(...)`. Values produced during setup
 * (wallet keys, RPC urls, token info) travel through `process.env`, which is the documented
 * way to pass data from `globalSetup` to tests: globalSetup runs in Playwright's main process
 * and workers are forked from it afterwards, so they inherit whatever env it set. That keeps
 * everything on the same channel `.e2e.env` already feeds via `env-cmd` (see the `test:e2e`
 * script), instead of introducing a second config transport.
 *
 * The whole config lives in one JSON-encoded variable rather than one variable per field so
 * that non-string fields keep their types, and so that keys like `PRIVATE_KEY` cannot collide
 * with the env names Synpress itself reads (see `.e2e.env.sample`).
 */
export type E2EConfig = {
  // RPC urls + identity
  ETH_RPC_URL: string;
  ARB_RPC_URL: string;
  ETH_SEPOLIA_RPC_URL: string;
  ARB_SEPOLIA_RPC_URL: string;
  ADDRESS: string;
  PRIVATE_KEY: string;
  INFURA_KEY?: string;
  ORBIT_TEST: '0' | '1';
  // native token
  NATIVE_TOKEN_SYMBOL: string;
  NATIVE_TOKEN_ADDRESS?: string;
  NATIVE_TOKEN_DECIMALS: number;
  // deployed test tokens (regular / orbit suite)
  ERC20_TOKEN_ADDRESS_PARENT_CHAIN?: string;
  ERC20_TOKEN_ADDRESS_CHILD_CHAIN?: string;
  L1_WETH_ADDRESS?: string;
  L2_WETH_ADDRESS?: string;
  CUSTOM_DESTINATION_ADDRESS?: string;
  REDEEM_RETRYABLE_TEST_TX?: string;
  LOCAL_WALLET_PRIVATE_KEY?: string;
};

// Set by globalSetup, read by the `e2eEnv` fixture.
const CONFIG_ENV_VAR = 'E2E_CONFIG';

export function writeE2EConfig(config: E2EConfig) {
  process.env[CONFIG_ENV_VAR] = JSON.stringify(config);
}

export function readE2EConfig(): E2EConfig {
  const raw = process.env[CONFIG_ENV_VAR];
  if (!raw) {
    throw new Error(
      `${CONFIG_ENV_VAR} is not set. Did Playwright globalSetup run? ` +
        `Run via the test:e2e script so globalSetup populates it first.`,
    );
  }
  return JSON.parse(raw) as E2EConfig;
}

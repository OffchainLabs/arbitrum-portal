# Synpress v3 → v4 Migration Plan

## Overview

Migrate `@synthetixio/synpress` from v3.7.3 to v4.0.5. Synpress v4 introduces a new architecture with browser caching, wallet setup files, and renamed commands.

## Current v3 Usage

| v3 Command | Files Using It |
|---|---|
| `cy.setupMetamask()` | `tests/support/index.ts` |
| `cy.acceptMetamaskAccess()` | `tests/support/common.ts` |
| `cy.confirmMetamaskTransaction()` | `commands.ts`, `withdrawCctp`, `withdrawERC20`, `withdrawNativeToken`, `redeemRetryable`, `depositCctp` |
| `cy.rejectMetamaskTransaction()` | `commands.ts`, `depositCctp`, `withdrawCctp`, `approveToken` |
| `cy.confirmMetamaskPermissionToSpend()` | `commands.ts` |
| `cy.addMetamaskNetwork()` | `tests/support/index.ts` |
| `cy.changeMetamaskNetwork()` | `commands.ts`, `withdrawCctp` |
| `cy.allowMetamaskToSwitchNetwork()` | `withdrawCctp` |
| `cy.switchToCypressWindow()` | `common.ts` |
| `cy.isCypressWindowActive()` | `common.ts` |
| `synpressPlugins(on, config)` | `synpress.config.ts`, `synpress.cctp.config.ts` |

## v3 → v4 Command Mapping

| v3 | v4 |
|---|---|
| `cy.setupMetamask(key, network)` | Wallet setup file + `cy.importWalletFromPrivateKey()` |
| `cy.acceptMetamaskAccess()` | `cy.connectToDapp()` |
| `cy.confirmMetamaskTransaction({gasConfig})` | `cy.confirmTransaction()` |
| `cy.rejectMetamaskTransaction()` | `cy.rejectTransaction()` |
| `cy.confirmMetamaskPermissionToSpend({spendLimit})` | `cy.approveTokenPermission({spendLimit})` |
| `cy.addMetamaskNetwork(config)` | `cy.addNetwork(config)` |
| `cy.changeMetamaskNetwork(name)` | `cy.switchNetwork({networkName})` |
| `cy.allowMetamaskToSwitchNetwork()` | `cy.approveSwitchNetwork()` |
| `cy.switchToCypressWindow()` | removed (automatic in v4) |
| `cy.isCypressWindowActive()` | removed (automatic in v4) |

## Key Breaking Changes

1. **Package imports** — `@synthetixio/synpress/plugins` → `@synthetixio/synpress/cypress`
2. **Config function** — `synpressPlugins(on, config)` → `configureSynpressForMetaMask(on, config)`
3. **Support file** — `@synthetixio/synpress/support` → `synpressCommandsForMetaMask()` from `@synthetixio/synpress/cypress/support`
4. **Test isolation** — Must set `testIsolation: false`
5. **Wallet setup** — New `*.setup.ts` file with `defineWalletSetup()` replaces `cy.setupMetamask()`
6. **Wallet cache** — Must be built via `npx synpress` before running tests
7. **Window management** — `cy.switchToCypressWindow()` / `cy.isCypressWindowActive()` removed
8. **Type definitions** — `@synthetixio/synpress/support/index.d.ts` replaced
9. **CI** — Headed mode required; already using xvfb so compatible

## Implementation Steps

### Step 1: Update dependency version
- `packages/arb-token-bridge-ui/package.json` — bump `@synthetixio/synpress` to `4.0.5`

### Step 2: Create wallet setup file
- New file: `packages/arb-token-bridge-ui/test/wallet-setup/basic.setup.ts`
- Uses `defineWalletSetup()` and `MetaMask` class to import wallet from seed phrase

### Step 3: Update synpress config files
- `synpress.config.ts` — Replace `synpressPlugins` with `configureSynpressForMetaMask`
- `synpress.cctp.config.ts` — Same change
- `getCommonSynpressConfig.ts` — Add `testIsolation: false`

### Step 4: Update support and command files
- `tests/support/index.ts` — Replace `@synthetixio/synpress/support` with `synpressCommandsForMetaMask()`; rewrite `before()` hook
- `tests/support/commands.ts` — Update all v3 commands to v4 equivalents
- `tests/support/common.ts` — Update `acceptMetamaskAccess` → `connectToDapp`, remove window management

### Step 5: Update type definitions
- `tests/e2e/cypress.d.ts` — Remove `@synthetixio/synpress/support/index.d.ts` reference
- `tests/tsconfig.json` — Update types array
- `synpress-plugins.d.ts` — Delete (no longer needed)

### Step 6: Update spec files
- `depositCctp.cy.ts` — `cy.rejectMetamaskTransaction()` → `cy.rejectTransaction()`
- `withdrawCctp.cy.ts` — Update `confirmMetamaskTransaction`, `rejectMetamaskTransaction`, `changeMetamaskNetwork`, `allowMetamaskToSwitchNetwork`
- `withdrawERC20.cy.ts` — `cy.confirmMetamaskTransaction()` → `cy.confirmTransaction()`
- `withdrawNativeToken.cy.ts` — Same
- `redeemRetryable.cy.ts` — Same
- `approveToken.cy.ts` — `cy.rejectMetamaskTransaction()` → `cy.rejectTransaction()`

### Step 7: Update root package.json and CI
- `package.json` — Update `test:e2e` scripts (replace `synpress run --configFile` with `cypress run --headed --browser chrome --configFile`)
- `.github/workflows/e2e-tests.yml` — Add `npx synpress` cache build step before test execution

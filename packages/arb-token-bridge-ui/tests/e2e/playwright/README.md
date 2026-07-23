# Playwright e2e

The bridge e2e suite, running on **Playwright** with the **Synpress v3** MetaMask plugin
(`@synthetixio/synpress` 3.7.3). This replaced the Cypress suite; see
[`CYPRESS_TO_PLAYWRIGHT_MIGRATION_PLAN.md`](../../../../../CYPRESS_TO_PLAYWRIGHT_MIGRATION_PLAN.md)
at the repo root.

## Layout

| File                                 | Role                                                                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../../../playwright.config.ts`      | runner config (regular / orbit suite)                                                                                                                                                                 |
| `../../../playwright.cctp.config.ts` | runner config for the CCTP suite (testnets)                                                                                                                                                           |
| `globalSetup.ts`                     | on-chain prep (deploy/fund ERC20 + WETH, approvals, redeem-retryable tx, custom-gas-token) and the activity/assertion background loops; writes `.e2e-config.json`. Replaces Cypress `setupNodeEvents` |
| `globalSetup.cctp.ts`                | CCTP prep: funds a fresh wallet on Sepolia/Arb Sepolia and pre-creates CCTP burns                                                                                                                     |
| `e2eConfig.ts`                       | typed read/write of `.e2e-config.json` (replaces `Cypress.env`)                                                                                                                                       |
| `fixtures.ts`                        | worker-scoped MetaMask persistent context + `e2eEnv` fixture                                                                                                                                          |
| `support/common.ts`                  | network configs + node-side chain/balance/activity helpers (no `cy`)                                                                                                                                  |
| `support/actions.ts`                 | the former Cypress custom commands as async `(page, ...)` functions                                                                                                                                   |
| `synpress.d.ts`                      | ambient module declarations for the Synpress v3 command paths                                                                                                                                         |
| `specs/*.spec.ts`                    | the tests (1:1 with the old `*.cy.ts`)                                                                                                                                                                |

## Architecture notes

- **MetaMask is worker-scoped**: it is set up once per worker (not per test), which is the main
  speed win. With a single worker the whole run shares one MetaMask, matching Cypress's
  `testIsolation: false`. Each test still gets a fresh `page` (tab). The wallet is connected once
  per worker (a module-level flag in `actions.ts`, mirroring the old `walletConnectedToDapp` task).
- **MetaMask version is pinned to `11.15.0`** (Synpress 3.7.3's default). Do not let it default to
  "latest" — newer MetaMask UIs don't match Synpress 3.7.3's selectors. Override with
  `METAMASK_VERSION` if needed.
- **The activity / assertion loops** run fire-and-forget inside `globalSetup` (Playwright's main
  process stays alive for the run), exactly as the Cypress config did.

## One-time setup

```bash
# from repo root
pnpm install
pnpm --filter arb-token-bridge-ui exec playwright install chromium
```

You also need a `.e2e.env` file in `packages/arb-token-bridge-ui/` (see `.e2e.env.sample`). A valid
`NEXT_PUBLIC_INFURA_KEY` (or `NEXT_PUBLIC_RPC_URL_SEPOLIA`) is required because the suite adds the
Sepolia / Arbitrum Sepolia networks and the tx-history / CCTP specs run on those testnets.

## Running

A local Nitro test node and the bridge app must be running (same as the Cypress suite):

```bash
# 1. start a local nitro test node (see DEVELOPMENT.md / CI for the exact ref)
# 2. start the app
pnpm start                                  # http://localhost:3000

# 3. in another terminal:
pnpm test:e2e                               # whole regular suite
pnpm test:e2e login                         # a single spec (filter by filename)
pnpm test:e2e:orbit                         # orbit (L3 ETH) variant
pnpm test:e2e:orbit:custom-gas-token        # orbit custom-gas-token variant
pnpm test:e2e:cctp                          # CCTP suite (uses playwright.cctp.config.ts)
```

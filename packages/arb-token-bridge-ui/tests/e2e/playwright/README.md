# Playwright e2e (Cypress -> Playwright migration POC)

This directory holds the Playwright version of the bridge e2e suite. It runs on
**Synpress v3** (same version as the Cypress suite) using Synpress's Playwright plugin. It
lives **alongside** the existing Cypress suite (`tests/e2e/specs/*.cy.ts`,
`synpress.config.ts`) so nothing is removed until the Playwright path is verified.

Currently ported: `specs/login.spec.ts` (POC, ported from `tests/e2e/specs/login.cy.ts`).

See [`CYPRESS_TO_PLAYWRIGHT_MIGRATION_PLAN.md`](../../../../../CYPRESS_TO_PLAYWRIGHT_MIGRATION_PLAN.md)
at the repo root for the full plan.

## Layout

| File                            | Role                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `../../../playwright.config.ts` | Playwright runner config (in the package root)                                          |
| `globalSetup.ts`                | on-chain prep + funding, writes `.e2e-config.json` (replaces Cypress `setupNodeEvents`) |
| `e2eConfig.ts`                  | typed read/write of the JSON config (replaces `config.env` / `Cypress.env`)             |
| `fixtures.ts`                   | MetaMask persistent-context fixture + `e2eEnv` worker fixture                           |
| `support/common.ts`             | network configs + chain helpers, ported without `cy` / `Cypress.env`                    |
| `support/actions.ts`            | custom commands (`login`, chain-button finders, ...) as async functions                 |
| `synpress.d.ts`                 | ambient module declarations for the Synpress v3 Playwright command paths                |
| `specs/login.spec.ts`           | the POC spec                                                                            |

## One-time setup

The current `synpress-migration` branch has Synpress **4.1.2** installed on disk (from the
paused v4 attempt), but this POC needs **3.7.3** (what `package.json` declares and what the
Cypress suite uses). Make sure 3.7.3 is what's installed, then install Playwright + its browser:

```bash
# from repo root
pnpm install                       # resolves @synthetixio/synpress@3.7.3 + @playwright/test
pnpm --filter arb-token-bridge-ui exec playwright install chromium
```

You also need a `.e2e.env` file in `packages/arb-token-bridge-ui/` (same one the Cypress suite
uses). See `.e2e.env.sample` for the variable names.

## Running

A local Nitro test node and the bridge app must be running, exactly as for the Cypress suite:

```bash
# 1. start a local nitro test node (see DEVELOPMENT.md / CI for the exact ref)
# 2. start the app
pnpm start                         # serves the bridge on http://localhost:3000

# 3. in another terminal, run the Playwright login POC
pnpm test:e2e:pw
```

Variants (mirror the Cypress scripts):

```bash
pnpm test:e2e:pw:orbit
pnpm test:e2e:pw:orbit:custom-gas-token
```

`globalSetup` runs first (funds the wallet, writes `.e2e-config.json`), then the
`fixtures.ts` context launches headed Chromium with the MetaMask extension and restores the
funded wallet via Synpress's `initialSetup`. On CI this needs a virtual display (xvfb), the
same as Cypress.

## Notes / known limitations of the POC

- MetaMask is set up per test (the `context` fixture is test-scoped, per the Synpress docs).
  This is slower than necessary; making it worker-scoped is a later optimization.
- Only the login flow's setup is implemented in `globalSetup`. Transactional specs need the
  rest of the Cypress `setupNodeEvents` prep (ERC20 deploy, WETH, approvals, the
  generate-activity / check-assertions background loops). That is Phase 1 in the plan.
- API signatures for the Synpress Playwright commands should be confirmed against the installed
  3.7.3 types; the published v3 docs lag the code in places.

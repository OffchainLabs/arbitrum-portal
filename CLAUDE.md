# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Arbitrum Portal is a Next.js monorepo containing the Arbitrum ecosystem homepage and token bridge UI.

### Workspace Packages

- **`packages/app/`** — Main Next.js 14 app that orchestrates routing to both portal and bridge
- **`packages/arb-token-bridge-ui/`** — Token bridge interface for moving assets between Arbitrum chains
- **`packages/portal/`** — Ecosystem homepage (projects, chains, resources)
- **`packages/components/`** — Shared UI components
- **`packages/scripts/`** — Build and data-fetching scripts

## Common Commands

```bash
# Development
yarn dev              # Start dev server (runs prebuild steps automatically)
yarn build            # Production build

# Code Quality
yarn lint             # TypeScript check + ESLint
yarn lint:fix         # TypeScript check + ESLint with auto-fix
yarn prettier:check   # Check formatting
yarn prettier:format  # Format all files

# Testing
yarn test:ci          # Run unit tests (Vitest, bridge package)
yarn audit:ci         # Run security audit
```

## Architecture

### Key Technologies

- **Next.js 14** (App Router) with **TypeScript** (strict mode)
- **Tailwind CSS 3** for styling
- **Zustand** for state management (custom ESLint rules enforced)
- **RainbowKit / wagmi / viem** for wallet and blockchain interactions
- **`@arbitrum/sdk`** for Arbitrum-specific bridge logic
- **Yarn 1** (classic) with workspaces
- **Node v22** (see `.nvmrc`)

### Path Aliases

Path aliases are defined in `tsconfig.base.json`. Key mappings:

- `@/bridge/*` → `packages/arb-token-bridge-ui/src/*`
- `@/portal/*` → `packages/portal/*`
- `@/components/*` → `packages/portal/components/*`
- `@/app-components/*` → `packages/app/src/components/*`

See `tsconfig.base.json` for the full list.

## TypeScript Conventions

- Strict mode is enabled with `noUncheckedIndexedAccess`
- Avoid `any` — it's a lint warning, prefer `unknown` where possible
- Unused variables are lint errors (except rest siblings and caught errors)

## Code Style

- Prettier with `@offchainlabs/prettier-config` + Tailwind CSS plugin + import sorting
- ESLint with `@offchainlabs/eslint-config-typescript` (base + next)
- Zustand rules enforced: `enforce-use-setstate`, `no-state-mutation`, `use-store-selectors`

## Testing and Quality Checklist

- Run `yarn lint` and `yarn prettier:check` before considering a task complete
- Run `yarn test:ci` to verify unit tests pass after changes
- Update existing tests when modifying related code

## Git Conventions

- **Conventional commits**: `type(scope): description`
- Common types: `feat`, `fix`, `chore`, `build`, `ci`, `refactor`, `test`, `docs`
- Common scopes: `bridge`, `deps`, `monitoring`
- Examples:
  - `feat(bridge): add swaps (#150)`
  - `fix(bridge): fix token row crash on null balances (#163)`
  - `build(deps): security advisories (#172)`
  - `chore: update Plume testnet urls (#167)`

## Development Notes

- **Environment Variables**: Copy `packages/app/.env.sample` to `packages/app/.env` and fill in keys. The bridge app requires RPC provider keys to function.
- **Prebuild Steps**: `yarn dev` and `yarn build` automatically run data-fetching and CSS build steps via `predev`/`prebuild` scripts.
- **Per-Package Context**: Check each package's own `package.json` and `tsconfig.json` for package-specific configuration.

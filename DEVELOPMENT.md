## Prerequisites

- Install [Node.js](https://nodejs.org/en/download/).
- Install [Yarn (version 1)](https://classic.yarnpkg.com).
- Use a Node version manager (like `nvm`) to ensure your Node version is compatible with project requirements in `.nvmrc` to avoid installation errors.

## Repository Structure

This repository contains the **Arbitrum Portal** - a Next.js application that combines:

- **Ecosystem App** (`packages/portal/`) - The Arbitrum ecosystem homepage showcasing projects, chains, and resources.
- **Bridge App** (`packages/arb-token-bridge-ui/`) - The token bridging interface for moving assets between Arbitrum Chains.
- **Main App** (`packages/app/`) - The Next.js application that orchestrates / routes to both apps.

## Quick Start

1. Clone the repository:

   ```bash
   $ git clone git@github.com:OffchainLabs/arbitrum-portal.git
   $ cd arbitrum-portal
   ```

2. Install dependencies:

   ```bash
   $ yarn
   ```

3. Run the application:

   ```bash
   $ yarn dev
   ```

4. Visit `http://localhost:3000/`

> **Note**: Your application will now be running with the Ecosystem app accessible. If you want to use the Bridge app (`/bridge` page), continue to the Environment Setup section below.

## Environment Setup for Bridge App

The Bridge app requires environment variables for full functionality:

1. Copy the environment file:

   ```bash
   $ cp ./packages/app/.env.local.sample ./packages/app/.env
   ```

2. Add your keys to `.env`:

   **Required:**

   - `NEXT_PUBLIC_RPC_PROVIDER = infura / alchemy`
   - `NEXT_PUBLIC_INFURA_KEY = your-infura-key`
   - `NEXT_PUBLIC_ALCHEMY_KEY = your-alchemy-key`
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = your-walletconnect-project-id` (Get from [WalletConnect dashboard](https://cloud.walletconnect.com/app))

   **Optional features (enable as needed):**

   - `NEXT_PUBLIC_FEATURE_FLAG_LIFI = true` (Enable LiFi integration)
   - `LIFI_KEY = your-lifi-key` (Get from [LiFi dashboard](https://portal.li.fi/))

   - `NEXT_PUBLIC_FEATURE_FLAG_ONRAMP = true / false` (Enable onramp functionality)
   - `NEXT_PUBLIC_FEATURE_FLAG_ONRAMP_SERVICES_ENABLED = moonpay` (Specify onramp services)

   - `NEXT_PUBLIC_MOONPAY_PK = your-moonpay-public-key` (Get from [MoonPay dashboard](https://dashboard.moonpay.com/))
   - `MOONPAY_SK = your-moonpay-secret-key` (Get from [MoonPay dashboard](https://dashboard.moonpay.com/))

## Testing

> **Note**: Testing is only available for the Bridge app. The Ecosystem app does not have associated tests - so this section can be ignored if you're only interested in running the Ecosystem app.

#### Unit Tests

```bash
# Run Unit tests in watch mode
$ yarn workspace arb-token-bridge-ui test
```

#### E2E Tests

E2E tests are only available for the Bridge app and require a local Nitro test node:

1. **Install Chromium version 128**

2. **Set up Nitro test node**:

   Follow the instructions [here](https://docs.arbitrum.io/node-running/how-tos/local-dev-node).

   Use the following command to run your test nodes locally for our tests. You may omit `--l3node --l3-token-bridge` if you don't intend on testing Orbit chains.

   ```bash
   ./test-node.bash --init --no-simple --tokenbridge --l3node --l3-token-bridge
   ```

   To run with a custom fee token also include the following flags:

   ```bash
   --l3-fee-token --l3-fee-token-decimals 18
   ```

   When the Nitro test-node is up and running you should see logs like `sequencer_1` and `staker-unsafe_1` in the terminal. This can take up to 15 minutes.

3. **Set up E2E environment**:

   ```bash
   $ cp ./packages/arb-token-bridge-ui/.e2e.env.sample ./packages/arb-token-bridge-ui/.e2e.env
   ```

4. **Update `.e2e.env`** with your keys:

   - `NEXT_PUBLIC_INFURA_KEY=your-infura-key`
   - `PRIVATE_KEY_USER=your-test-private-key`

5. **Run E2E tests**:

   ```bash
   # Standard Bridge E2E tests
   $ yarn test:e2e

   # Orbit chain tests
   $ yarn test:e2e:orbit

   # CCTP Bridging tests
   $ yarn test:e2e:cctp
   ```

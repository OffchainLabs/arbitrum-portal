import { defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask } from '@synthetixio/synpress/playwright';
import 'dotenv/config';

// The wallet cache only bootstraps MetaMask with an initialized state.
// The actual test wallet (PRIVATE_KEY_USER) is imported at runtime in support/index.ts
// via cy.importWalletFromPrivateKey().
const PRIVATE_KEY = process.env.PRIVATE_KEY_USER;
const PASSWORD = process.env.WALLET_PASSWORD ?? 'SynpressTest@1234';

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY_USER environment variable is required to build the wallet cache.');
}

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD);
  await metamask.importWalletFromPrivateKey(PRIVATE_KEY);
});

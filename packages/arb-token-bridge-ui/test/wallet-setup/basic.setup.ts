import { defineWalletSetup } from '@synthetixio/synpress';
import { MetaMask } from '@synthetixio/synpress/playwright';
import 'dotenv/config';

// The wallet cache only bootstraps MetaMask with an initialized state.
// The actual test wallet (PRIVATE_KEY_USER) is imported at runtime in support/index.ts
// via cy.importWalletFromPrivateKey().
const CACHE_SEED_PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PASSWORD = process.env.WALLET_PASSWORD ?? 'SynpressTest@1234';

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD);
  await metamask.importWallet(CACHE_SEED_PHRASE);
});

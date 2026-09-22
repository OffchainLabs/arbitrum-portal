import type { Signers, WalletHandle } from './types';

/** The signers of the given wallets, keyed by ecosystem */
export function getSigners(...wallets: WalletHandle[]): Partial<Signers> {
  // Each handle carries the signer of its own ecosystem
  return Object.fromEntries(
    wallets.map((wallet) => [wallet.ecosystem, wallet.signer]),
  ) as Partial<Signers>;
}

import { PublicKey } from '@solana/web3.js';
import { utils } from 'ethers';

import type { WalletEcosystem } from './types';

type AddressEcosystemHandler = {
  normalize: (address: string) => string | undefined;
};

const addressEcosystemHandlers = {
  evm: {
    normalize: (address) => (utils.isAddress(address) ? address.toLowerCase() : undefined),
  },
  solana: {
    normalize: (address) => {
      try {
        return new PublicKey(address).toBase58();
      } catch {
        return undefined;
      }
    },
  },
} satisfies Record<WalletEcosystem, AddressEcosystemHandler>;

export class AddressAdapter {
  private readonly normalizedAddress: string | undefined;

  constructor(address: string) {
    const trimmedAddress = address.trim();
    this.normalizedAddress = Object.values(addressEcosystemHandlers)
      .map((handler) => handler.normalize(trimmedAddress))
      .find((normalizedAddress) => normalizedAddress !== undefined);
  }

  isValid(): boolean {
    return this.normalizedAddress !== undefined;
  }

  normalize(): string | undefined {
    return this.normalizedAddress;
  }
}

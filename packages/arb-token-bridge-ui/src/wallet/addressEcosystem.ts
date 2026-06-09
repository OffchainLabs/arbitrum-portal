import { PublicKey } from '@solana/web3.js';
import { utils } from 'ethers';

import type { WalletEcosystem } from './types';

export type AddressEcosystemAdapter = {
  isAddress: (address: string) => boolean;
  normalize: (address: string) => string;
};

export const addressEcosystemAdapters = {
  evm: {
    isAddress: (address: string) => utils.isAddress(address.trim()),
    normalize: (address: string) => address.trim().toLowerCase(),
  },
  solana: {
    isAddress: (address: string) => {
      try {
        new PublicKey(address.trim());
        return true;
      } catch {
        return false;
      }
    },
    normalize: (address: string) => address.trim(),
  },
} as const satisfies Record<WalletEcosystem, AddressEcosystemAdapter>;

export const addressAdapter = {
  normalize(address: string): string | undefined {
    for (const adapter of Object.values(addressEcosystemAdapters)) {
      if (adapter.isAddress(address)) {
        return adapter.normalize(address);
      }
    }

    return undefined;
  },
};

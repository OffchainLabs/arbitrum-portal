import { vi } from 'vitest';

import type { EvmSigner, Signers, SolanaSigner } from '../wallet/types';

/** Signers for the given connected addresses, with mocked signing methods */
export function createMockSigners({
  evm,
  solana,
}: { evm?: string; solana?: string } = {}): Signers {
  return {
    evm: {
      getAddress: () => evm,
      getWalletClient: vi.fn<EvmSigner['getWalletClient']>(),
    },
    solana: {
      getAddress: () => solana,
      getWalletAdapter: vi.fn<SolanaSigner['getWalletAdapter']>(),
    },
  };
}

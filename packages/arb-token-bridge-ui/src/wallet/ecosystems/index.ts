import type { WalletEcosystem } from '../types';
import { evmEcosystem } from './evm';
import { solanaEcosystem } from './solana';

/** Everything the bridge needs to know about an ecosystem that doesn't require an RPC. */
export type EcosystemConfig = {
  /** Whether the bridge offers this ecosystem */
  isEnabled: () => boolean;
};

export const ecosystems: Record<WalletEcosystem, EcosystemConfig> = {
  evm: evmEcosystem,
  solana: solanaEcosystem,
};

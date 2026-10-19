import bs58 from 'bs58';

import type { EcosystemConfig, ValidationOptions } from '.';
import { solanaChain } from '../solana/network';

export const SOLANA_NATIVE_TOKEN_ADDRESS = '11111111111111111111111111111111';

export function isValidSolanaAddress(address: string | undefined): boolean {
  if (!address || address.startsWith('0x')) return false;
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

export function isValidSolanaSignature(signature: string): boolean {
  try {
    return bs58.decode(signature).length === 64;
  } catch {
    return false;
  }
}

// Reads `solanaEcosystem.isEnabled` at call time, so mocking it also gates validation
function isEnabledOrIgnored({ ignoreFeatureFlag = false }: ValidationOptions = {}) {
  return ignoreFeatureFlag || solanaEcosystem.isEnabled();
}

export const solanaEcosystem: EcosystemConfig = {
  isEnabled: () => process.env.NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED === 'true',
  name: 'Solana',
  address: {
    isValid: (address, options) => isEnabledOrIgnored(options) && isValidSolanaAddress(address),
    // base58 is case-sensitive
    normalize: (address) => address,
  },
  transactionId: {
    isValid: (signature, options) =>
      isEnabledOrIgnored(options) && isValidSolanaSignature(signature),
    normalize: (signature) => signature,
  },
  nativeTokenAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
  hasParentChildTokenAddresses: false,
  hasTokenApprovals: false,
  // Solscan
  explorerAccountPath: 'account',
  chains: [solanaChain],
  namespace: 'solana',
};

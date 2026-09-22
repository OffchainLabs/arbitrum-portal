import bs58 from 'bs58';

import type { EcosystemConfig, ValidationOptions } from '.';
import type { SolanaAddress } from '../../util/AddressUtils';
import { solanaChain } from '../solana/network';

export const SOLANA_NATIVE_TOKEN_ADDRESS = '11111111111111111111111111111111';

// base58 lengths of 32 and 64 bytes, checked before decoding like `@solana/kit`.
// `bs58.decode` takes quadratic time, so a long pasted string would freeze the page.
const ADDRESS_LENGTH = { min: 32, max: 44 };
const SIGNATURE_LENGTH = { min: 64, max: 88 };

function hasLength(value: string, { min, max }: { min: number; max: number }) {
  return value.length >= min && value.length <= max;
}

export function isValidSolanaAddress(address: string | undefined): address is SolanaAddress {
  if (!address || address.startsWith('0x') || !hasLength(address, ADDRESS_LENGTH)) return false;
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

export function isValidSolanaSignature(signature: string): boolean {
  if (!hasLength(signature, SIGNATURE_LENGTH)) return false;
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
    isCaseSensitive: true,
  },
  transactionId: {
    isValid: (signature, options) =>
      isEnabledOrIgnored(options) && isValidSolanaSignature(signature),
    normalize: (signature) => signature,
  },
  nativeTokenAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
  isLifiOnly: true,
  hasGasPrice: false,
  // AppKit identifies Solana networks by their genesis hash
  isAppKitNetworkIdChainId: false,
  hasTokenApprovals: false,
  // Solscan
  explorerAccountPath: 'account',
  chains: [solanaChain],
  nativeAssetType: 'SOL',
  namespace: 'solana',
};

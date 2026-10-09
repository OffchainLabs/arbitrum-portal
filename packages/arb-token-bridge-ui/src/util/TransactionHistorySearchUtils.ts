import { utils } from 'ethers';

import { type Address, ecosystemAddressValidators, normalizeAddress } from './AddressUtils';
import { isSolanaEnabled } from './featureFlag';

export function parseHistoryAddress(address: string): Address | undefined {
  if (isSolanaEnabled() && ecosystemAddressValidators.solana(address)) return address;
  if (!ecosystemAddressValidators.evm(address)) return undefined;
  return normalizeAddress(utils.getAddress(address));
}

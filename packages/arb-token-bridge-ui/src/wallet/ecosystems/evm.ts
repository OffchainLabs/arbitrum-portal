import { isAddress, zeroAddress } from 'viem';

import type { EcosystemConfig } from '.';

export const evmEcosystem: EcosystemConfig = {
  isEnabled: () => true,
  address: {
    isValid: (address) => isAddress(address),
    // EVM addresses are case-insensitive: lowercasing drops the checksum casing
    normalize: (address) => address.toLowerCase(),
  },
  nativeTokenAddress: zeroAddress,
  hasParentChildTokenAddresses: true,
};

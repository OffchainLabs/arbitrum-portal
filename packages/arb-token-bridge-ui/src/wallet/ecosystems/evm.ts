import { isAddress, isHash, zeroAddress } from 'viem';

import type { EcosystemConfig } from '.';

export const evmEcosystem: EcosystemConfig = {
  isEnabled: () => true,
  address: {
    isValid: (address) => isAddress(address),
    // EVM addresses are case-insensitive: lowercasing drops the checksum casing
    normalize: (address) => address.toLowerCase(),
    isCaseSensitive: false,
  },
  transactionId: {
    isValid: (transactionId) => isHash(transactionId),
    normalize: (transactionId) => transactionId.toLowerCase(),
  },
  nativeTokenAddress: zeroAddress,
  isLifiOnly: false,
  hasGasPrice: true,
  usesEthersSigner: true,
  hasTokenApprovals: true,
};

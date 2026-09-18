import { isAddress, isHash, zeroAddress } from 'viem';
import {
  arbitrum,
  arbitrumNova,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  sepolia,
} from 'viem/chains';

import type { EcosystemConfig } from '.';

export const evmEcosystem: EcosystemConfig = {
  isEnabled: () => true,
  address: {
    isValid: (address) => isAddress(address),
    // EVM addresses are case-insensitive: lowercasing drops the checksum casing
    normalize: (address) => address.toLowerCase(),
  },
  transactionId: {
    isValid: (transactionId) => isHash(transactionId),
    normalize: (transactionId) => transactionId.toLowerCase(),
  },
  nativeTokenAddress: zeroAddress,
  hasParentChildTokenAddresses: true,
  hasTokenApprovals: true,
  explorerAccountPath: 'address',
  chains: [mainnet, sepolia, arbitrum, arbitrumNova, arbitrumSepolia, base, baseSepolia],
};

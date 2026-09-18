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

// `as const` keeps each chain id literal, so `defaultRpcUrls` must list every one of them
export const evmChains = [
  mainnet,
  sepolia,
  arbitrum,
  arbitrumNova,
  arbitrumSepolia,
  base,
  baseSepolia,
] as const;
export type CoreEvmChainId = (typeof evmChains)[number]['id'];

export const evmEcosystem: EcosystemConfig = {
  isEnabled: () => true,
  name: 'EVM',
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
  hasGasPrice: true,
  usesEthersSigner: true,
  hasTokenApprovals: true,
  explorerAccountPath: 'address',
  chains: evmChains,
  namespace: 'eip155',
};

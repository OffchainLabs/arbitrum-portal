import { defineChain, isAddress, isHash, zeroAddress } from 'viem';
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
import { ChainId } from '../../types/ChainId';
import { loadEnvironmentVariableWithFallback } from '../../util';

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

// Elysium stays hidden, with no routes and no network entry, until this flag is on
export const isElysiumEnabled = () =>
  process.env.NEXT_PUBLIC_FEATURE_FLAG_ELYSIUM_ENABLED === 'true';

// Kinetiq's chain settles to HyperEVM, which the bridge doesn't support, so only LiFi reaches it
export const elysium = defineChain({
  id: ChainId.Elysium,
  name: 'Elysium',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  // About 0.23 seconds between blocks on mainnet
  blockTime: 250,
  rpcUrls: {
    default: {
      http: [
        loadEnvironmentVariableWithFallback({
          env: process.env.NEXT_PUBLIC_RPC_URL_ELYSIUM,
          fallback: 'https://rpc.elysium.kinetiq.xyz',
        }),
      ],
    },
  },
  blockExplorers: {
    default: { name: 'Elysium Explorer', url: 'https://elysium.kinetiq.xyz/explorer' },
  },
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
});

export const evmEcosystem: EcosystemConfig = {
  isEnabled: () => true,
  name: 'EVM',
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
  nativeCurrencyReserve: 0n,
  // 0.001 of the native currency, read before a quote on routes from or to a LiFi-only chain. LiFi
  // quotes about 0.0003 HYPE of gas for an Elysium transfer
  gasBufferBeforeQuote: 1_000_000_000_000_000n,
  lifiOnlyChains: [elysium],
  hasGasPrice: true,
  isAppKitNetworkIdChainId: true,
  hasTokenApprovals: true,
  explorerAccountPath: 'address',
  chains: [...evmChains, elysium],
  nativeAssetType: 'ETH',
  namespace: 'eip155',
};

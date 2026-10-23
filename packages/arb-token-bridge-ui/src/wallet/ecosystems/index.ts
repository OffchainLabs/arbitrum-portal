import type { Chain } from 'viem';

import type { WalletEcosystem } from '../types';
import { evmEcosystem } from './evm';
import { solanaEcosystem } from './solana';

export type ValidationOptions = {
  /** Check the format even while the ecosystem is disabled, e.g. for data returned by an API */
  ignoreFeatureFlag?: boolean;
};

/** Everything the bridge needs to know about an ecosystem that doesn't require an RPC. */
export type EcosystemConfig = {
  /** Whether the bridge offers this ecosystem */
  isEnabled: () => boolean;
  address: {
    /** False while the ecosystem is disabled, unless `ignoreFeatureFlag` is set */
    isValid: (address: string, options?: ValidationOptions) => boolean;
    normalize: (address: string) => string;
    /** Whether two addresses that differ only in case are different accounts */
    isCaseSensitive: boolean;
  };
  transactionId: {
    /** False while the ecosystem is disabled, unless `ignoreFeatureFlag` is set */
    isValid: (transactionId: string, options?: ValidationOptions) => boolean;
    normalize: (transactionId: string) => string;
  };
  /** Address that stands for the native currency in balance requests and LiFi quotes */
  nativeTokenAddress: string;
  /**
   * Every chain of the ecosystem reaches Arbitrum only through LiFi: no parent/child token addresses
   * and no canonical bridge
   */
  isLifiOnly: boolean;
  /** Chains price gas with an EVM gas price, as returned by `eth_gasPrice` */
  hasGasPrice: boolean;
  /** Tokens need an allowance before a transfer can move them, as with ERC-20 approvals */
  hasTokenApprovals: boolean;
  /** Explorer path segment for account pages */
  explorerAccountPath: string;
  /** Built-in chains. The network registry adds Orbit, local and custom chains as EVM */
  chains: readonly Chain[];
};

export const ecosystems: Record<WalletEcosystem, EcosystemConfig> = {
  evm: evmEcosystem,
  solana: solanaEcosystem,
};

/** Ecosystems without Arbitrum's token bridge, such as Solana, whose chains only reach Arbitrum through LiFi */
export function getLifiOnlyEcosystems(): EcosystemConfig[] {
  return Object.values(ecosystems).filter((ecosystem) => !ecosystem.hasParentChildTokenAddresses);
}

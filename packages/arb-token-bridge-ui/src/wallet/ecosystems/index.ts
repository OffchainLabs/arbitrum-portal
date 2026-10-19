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
  /** Shown next to the wallet of this ecosystem */
  name: string;
  address: {
    /** False while the ecosystem is disabled, unless `ignoreFeatureFlag` is set */
    isValid: (address: string, options?: ValidationOptions) => boolean;
    normalize: (address: string) => string;
  };
  transactionId: {
    /** False while the ecosystem is disabled, unless `ignoreFeatureFlag` is set */
    isValid: (transactionId: string, options?: ValidationOptions) => boolean;
    normalize: (transactionId: string) => string;
  };
  /** Address that stands for the native currency in balance requests and LiFi quotes */
  nativeTokenAddress: string;
  /** Tokens have separate parent and child chain addresses, as with Arbitrum's token bridge */
  hasParentChildTokenAddresses: boolean;
  /** Tokens need an allowance before a transfer can move them, as with ERC-20 approvals */
  hasTokenApprovals: boolean;
  /** Explorer path segment for account pages */
  explorerAccountPath: string;
  /** Built-in chains. The network registry adds Orbit, local and custom chains as EVM */
  chains: readonly Chain[];
  /** AppKit (CAIP-2) namespace */
  namespace: 'eip155' | 'solana';
};

export const ecosystems: Record<WalletEcosystem, EcosystemConfig> = {
  evm: evmEcosystem,
  solana: solanaEcosystem,
};

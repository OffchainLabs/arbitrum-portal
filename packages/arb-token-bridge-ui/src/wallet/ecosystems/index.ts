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
  /** Chains price gas with an EVM gas price, as returned by `eth_gasPrice` */
  hasGasPrice: boolean;
  /** Transfers sign with wagmi's ethers signer, which is only ready once the wallet connects */
  usesEthersSigner: boolean;
  /** AppKit identifies the networks of this ecosystem by their chain id, so the connect modal can preselect one */
  isAppKitNetworkIdChainId: boolean;
  /** Tokens need an allowance before a transfer can move them, as with ERC-20 approvals */
  hasTokenApprovals: boolean;
  /** Explorer path segment for account pages */
  explorerAccountPath: string;
  /** Built-in chains. The network registry adds Orbit, local and custom chains as EVM */
  chains: readonly Chain[];
  /** Asset type reported to analytics for the native currency */
  nativeAssetType: 'ETH' | 'SOL';
  /** AppKit (CAIP-2) namespace */
  namespace: 'eip155' | 'solana';
};

export const ecosystems: Record<WalletEcosystem, EcosystemConfig> = {
  evm: evmEcosystem,
  solana: solanaEcosystem,
};

/** Ecosystems without Arbitrum's token bridge, such as Solana, whose chains only reach Arbitrum through LiFi */
export function getLifiOnlyEcosystems(): EcosystemConfig[] {
  return Object.values(ecosystems).filter((ecosystem) => !ecosystem.hasParentChildTokenAddresses);
}

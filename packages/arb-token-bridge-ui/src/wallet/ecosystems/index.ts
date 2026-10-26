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
  /** Tokens need an allowance before a transfer can move them, as with ERC-20 approvals */
  hasTokenApprovals: boolean;
};

export const ecosystems: Record<WalletEcosystem, EcosystemConfig> = {
  evm: evmEcosystem,
  solana: solanaEcosystem,
};

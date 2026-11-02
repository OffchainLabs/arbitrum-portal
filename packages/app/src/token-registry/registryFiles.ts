import type { ProviderId } from './types';

// The token-list repo's registry job publishes these files. The test folder holds the files of
// the last test run.
export const TOKEN_REGISTRY_URL =
  process.env.NEXT_PUBLIC_TOKEN_REGISTRY_URL ??
  'https://tokenlist.arbitrum.io/TestFolder/TokenRegistry/v1';

// Every address in the registry files is lowercase.
export type RegistryFileToken = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coinKey?: string;
  // The canonical parent token on the chain's parent chain.
  parentAddress?: string;
  isOft?: true;
  // The same token on the other registry chains, keyed by chain id.
  counterparts?: Record<string, string>;
};

export type RegistryChainFile = {
  generatedAt: string;
  chainId: number;
  parentChainId?: number;
  tokens: RegistryFileToken[];
};

export type RegistryPairFile = {
  sourceChainId: number;
  destinationChainId: number;
  lifi?: { fromTokens: string[]; toTokens: string[] };
};

export type RegistryIndexFile = {
  generatedAt: string;
  chains: { chainId: number; name: string; parentChainId?: number }[];
  pairs: { sourceChainId: number; destinationChainId: number }[];
};

export type TopToken = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  volumeUSD24H?: number;
  // Not in the registry files: the server read it from the chain when the user pasted its address.
  isImported?: true;
};

export type TopFile = {
  generatedAt: string;
  tokens: TopToken[];
};

export type DestinationOption = TopToken & { providers: ProviderId[] };

export type DestinationChain = {
  chainId: number;
  // The same token as the source when the source can reach it, otherwise the canonical token,
  // otherwise the native token.
  defaultToken: DestinationOption;
  // The token the canonical bridge delivers on this chain, when it has a route.
  canonicalToken?: DestinationOption;
};

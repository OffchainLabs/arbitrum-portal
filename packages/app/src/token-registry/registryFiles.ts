import { isAddress } from 'viem';

import type { ProviderId } from './types';

// The token-list repo's registry job publishes these files. The test folder holds the files of
// the last test run. Version 2 has no pair files: the chain files flag the tokens LiFi routes.
export const TOKEN_REGISTRY_URL =
  process.env.NEXT_PUBLIC_TOKEN_REGISTRY_URL ??
  'https://tokenlist.arbitrum.io/TestFolder/TokenRegistry/v2';

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
  // LiFi routes the token on every LiFi pair of the chain.
  isLifi?: true;
};

export type RegistryChainFile = {
  generatedAt: string;
  chainId: number;
  parentChainId?: number;
  tokens: RegistryFileToken[];
};

export type RegistryIndexFile = {
  generatedAt: string;
  chains: { chainId: number; name: string; parentChainId?: number }[];
  // hasLifi: the bridge offers LiFi on the pair, and LiFi connects it.
  pairs: { sourceChainId: number; destinationChainId: number; hasLifi?: true }[];
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

// What the search and destination-tokens endpoints return. A complete list holds every token
// that matches, so the picker can search it without the server.
export type TokenList<T extends TopToken = TopToken> = { tokens: T[]; isComplete: boolean };

export type DestinationChain = {
  chainId: number;
  // The same token as the source when the source can reach it, otherwise the canonical token,
  // otherwise the native token.
  defaultToken: DestinationOption;
  // The token the canonical bridge delivers on this chain, when it has a route.
  canonicalToken?: DestinationOption;
};

// Lower is better. An address only matches itself.
export function getSearchScore(
  token: Pick<TopToken, 'address' | 'symbol' | 'name'>,
  query: string,
): number | null {
  if (isAddress(query)) {
    return token.address === query ? 0 : null;
  }
  const symbol = token.symbol.toLowerCase();
  if (symbol === query) {
    return 0;
  }
  if (symbol.startsWith(query)) {
    return 1;
  }
  if (symbol.includes(query)) {
    return 2;
  }
  return token.name.toLowerCase().includes(query) ? 3 : null;
}

// The tokens that match, best first. Tokens with the same score keep their order.
export function searchTokens<T extends TopToken>(tokens: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return tokens
    .flatMap((token) => {
      const score = getSearchScore(token, normalizedQuery);
      return score === null ? [] : [{ token, score }];
    })
    .sort((a, b) => a.score - b.score)
    .map(({ token }) => token);
}

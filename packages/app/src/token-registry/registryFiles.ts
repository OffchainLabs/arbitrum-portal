import { isAddress } from 'viem';

import { ChainId } from '@/bridge/types/ChainId';

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
  // Not in the registry files: the server read it from the chain when the user pasted its address.
  isImported?: true;
};

// The order is the ranking across every chain: the curated tokens, the native tokens, then LiFi's
// 24-hour volume, then symbol.
export type TopFile = {
  generatedAt: string;
  tokens: TopToken[];
};

export type DestinationOption = TopToken & { providers: ProviderId[] };

// What the search and destination-tokens endpoints return. A complete list holds every token
// that matches, so the picker can search it without the server.
export type TokenList<T extends TopToken = TopToken> = { tokens: T[]; isComplete: boolean };

// What the balances endpoint returns: the tokens the wallet holds, with the balance in the token's
// smallest unit. failedChainIds lists the chains whose RPC call failed.
export type HeldToken = TopToken & { balance: string };
export type HeldTokens = { tokens: HeldToken[]; failedChainIds: number[] };

export type DestinationChain = {
  chainId: number;
  // The same token as the source when the source can reach it, otherwise the canonical token,
  // otherwise the native token.
  defaultToken: DestinationOption;
  // The token the canonical bridge delivers on this chain, when it has a route.
  canonicalToken?: DestinationOption;
};

// Ether on Ethereum to Arbitrum One, like the bridge.
export const DEFAULT_SELECTION = {
  sourceChainId: ChainId.Ethereum,
  destinationChainId: ChainId.ArbitrumOne,
};

// What the selection endpoint returns for the tokens of a URL, so the page can show them without
// top.json.
export type Selection = {
  // The chain the source picker opens on.
  sourceChainId: number;
  // Absent when the URL's token is not a token on its chain.
  sourceToken?: TopToken;
  // The chains the source reaches, each with its default token. The destination picker loads the
  // tokens of these chains from the destination-tokens endpoint.
  destinationChains: DestinationChain[];
  // The requested chain when the source reaches it, otherwise the first chain. Absent when the
  // source reaches no chain.
  destinationChainId?: number;
  // The default token of that chain: the requested token when the source reaches it.
  destinationToken?: DestinationOption;
};

// Each destination chain of a request reads the ranks of the same top file.
const ranksByTopFile = new WeakMap<TopFile, Map<string, number>>();

// A token's position in the top file.
function getRanks(top: TopFile): Map<string, number> {
  const cached = ranksByTopFile.get(top);
  if (cached) {
    return cached;
  }
  const ranks = new Map(
    top.tokens.map((token, index) => [`${token.chainId}:${token.address}`, index]),
  );
  ranksByTopFile.set(top, ranks);
  return ranks;
}

// By top-file rank, then the tokens outside the top file by symbol. localeCompare goes through
// Intl, which is slow on sorts of thousands of tokens.
export function getTokenComparator(top: TopFile): (a: TopToken, b: TopToken) => number {
  const ranks = getRanks(top);
  const getRank = (token: TopToken) =>
    ranks.get(`${token.chainId}:${token.address}`) ?? Number.MAX_SAFE_INTEGER;
  return (a, b) =>
    getRank(a) - getRank(b) || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0);
}

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

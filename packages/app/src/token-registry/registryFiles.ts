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
  // On a canonical parent token, the child chains its canonical deposit may not reach, because
  // LayerZero bridges the token there.
  oftBlockedChainIds?: number[];
  // The same token on the other registry chains, keyed by chain id.
  counterparts?: Record<string, string>;
  // LiFi routes the token on at least one LiFi pair of the chain.
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
  chains: {
    chainId: number;
    name: string;
    parentChainId?: number;
    // The chain's token files, in order. Without it, the chain has one file: chains/<id>.json.
    files?: string[];
  }[];
  // hasLifi: the bridge offers LiFi on the pair, and LiFi connects it.
  pairs: {
    sourceChainId: number;
    destinationChainId: number;
    hasLifi?: true;
  }[];
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
  // LiFi routes the token. A destination chain with lifi reaches every such token.
  isLifi?: true;
};

// The order is the ranking across every chain: the curated tokens, the native tokens, then LiFi's
// 24-hour volume, then symbol.
export type TopFile = {
  generatedAt: string;
  tokens: TopToken[];
};

export type DestinationOption = TopToken & {
  providers: ProviderId[];
  isCounterpart?: true;
};

export type DestinationSelection =
  | {
      kind: 'resolved';
      sourceToken: TopToken;
      destinationToken: DestinationOption;
      sourceChanged: boolean;
    }
  | { kind: 'unavailable'; reason: string };

// What the search endpoint returns. A complete list holds every token
// that matches, so the picker can search it without the server.
export type TokenList<T extends TopToken = TopToken> = {
  tokens: T[];
  isComplete: boolean;
};

// What the balances endpoint returns: the tokens the wallet holds, with the balance in the token's
// smallest unit. failedChainIds lists the chains whose RPC call failed.
export type HeldToken = TopToken & { balance: string };
export type HeldTokens = { tokens: HeldToken[]; failedChainIds: number[] };

export type DestinationChain = {
  chainId: number;
  // The pair's override, otherwise the canonical, LayerZero, or LiFi same-asset token, otherwise the
  // native token, otherwise any reachable token.
  defaultToken: DestinationOption;
  // The same-asset tokens: the canonical token, the LayerZero token, the LiFi counterpart, the
  // pair's override and the default token. A few per chain.
  tokens: DestinationOption[];
  // The source reaches every token with isLifi on this chain through LiFi.
  lifi: boolean;
};

// The providers that take the source to a token, from the selection's destination chains.
// Undefined when the source does not reach the token, so picking it changes the source.
export function getDestinationProviders(
  chains: DestinationChain[],
  token: Pick<TopToken, 'chainId' | 'address' | 'isLifi'>,
): ProviderId[] | undefined {
  const chain = chains.find(({ chainId }) => chainId === token.chainId);
  if (!chain) {
    return undefined;
  }
  const listed = chain.tokens.find(({ address }) => address === token.address);
  if (listed) {
    return listed.providers;
  }
  return chain.lifi && token.isLifi ? ['lifi'] : undefined;
}

// Ether on Ethereum to Arbitrum One, like the bridge.
// top.json keeps up to this many tokens per chain. A chain with fewer has all its tokens there.
export const TOP_TOKENS_PER_CHAIN = 1_000;

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
  // source: a destination pick changed the source. unavailable: no source reaches the picked
  // destination, so the transfer stays as it was.
  adjustment?: {
    kind: 'source-chain' | 'destination' | 'source' | 'unavailable';
    message: string;
  };
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
  chainName = '',
): number | null {
  if (isAddress(query)) {
    return token.address.toLowerCase() === query.toLowerCase() ? 0 : null;
  }
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const network = chainName.toLowerCase();
  const tokenWords = words.filter((word) => word.length < 2 || !network.includes(word));
  if (words.length === 0) return null;
  if (tokenWords.length === 0) return 0;
  const tokenQuery = tokenWords.join(' ');
  const symbol = token.symbol.toLowerCase();
  if (symbol === tokenQuery) {
    return 0;
  }
  if (symbol.startsWith(tokenQuery)) {
    return 1;
  }
  if (symbol.includes(tokenQuery)) {
    return 2;
  }
  const name = token.name.toLowerCase();
  return tokenWords.every((word) => symbol.includes(word) || name.includes(word)) ? 3 : null;
}

// The tokens that match, best first. Tokens with the same score keep their order.
export function searchTokens<T extends TopToken>(
  tokens: T[],
  query: string,
  chains: RegistryIndexFile['chains'] = [],
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  const names = new Map(chains.map((chain) => [chain.chainId, chain.name]));
  return tokens
    .flatMap((token) => {
      const score = getSearchScore(token, normalizedQuery, names.get(token.chainId));
      return score === null ? [] : [{ token, score }];
    })
    .sort((a, b) => a.score - b.score)
    .map(({ token }) => token);
}

export function getNetworkSuggestions(query: string, chains: RegistryIndexFile['chains']) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (isAddress(query.trim())) return [];
  return chains.filter((chain) =>
    words.some((word) => word.length >= 2 && chain.name.toLowerCase().includes(word)),
  );
}

export function removeNetworkQuery(query: string, chainName: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length < 2 || !chainName.toLowerCase().includes(word.toLowerCase()))
    .join(' ');
}

export function tokenKey(token: Pick<TopToken, 'chainId' | 'address'>): string {
  return `${token.chainId}:${token.address.toLowerCase()}`;
}

export function mergePickerTokens<T extends TopToken>(...lists: T[][]): T[] {
  const tokens = new Map<string, T>();
  for (const list of lists) {
    for (const token of list) {
      if (!tokens.has(tokenKey(token))) tokens.set(tokenKey(token), token);
    }
  }
  return [...tokens.values()];
}

export function addRecentToken<T extends TopToken>(recents: T[], token: T): T[] {
  return mergePickerTokens([token], recents).slice(0, 4);
}

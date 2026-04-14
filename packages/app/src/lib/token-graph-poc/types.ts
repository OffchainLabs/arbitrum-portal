export type TokenVariant = {
  id: string;
  chainId: number;
  tokenType: 'native' | 'contract';
  address?: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  supportsSwap?: boolean;
};

export type MappingProvider = 'canonical' | 'cctp' | 'lifi' | 'oft';

export type MappingEdge = {
  id: string;
  fromTokenId: string;
  toTokenId: string;
  provider: MappingProvider;
  metadata?: {
    canonical?: {
      parentGatewayAddress?: string;
      childGatewayAddress?: string;
    };
  };
};

export type TokenGraph = {
  edges: MappingEdge[];
};

export type TokenGraphChain = {
  chainId: number;
  name: string;
  nativeSymbol: string;
};

export type TokensResponse = {
  items: TokenVariant[];
};

export type RouteCandidateCapabilities = {
  supportsBatchDeposit: boolean;
};

export type RouteCandidate = {
  routeId: string;
  family: MappingProvider;
  provider: MappingProvider;
  sourceTokenId: string;
  destinationToken: TokenVariant;
  bestPriority: number;
  capabilities: RouteCandidateCapabilities;
  mode: 'direct' | 'swap';
};

export type RouteCandidatesResponse = {
  sourceTokenId: string;
  items: RouteCandidate[];
};

export type BalanceItem = {
  token: TokenVariant;
  balance: string;
};

export type BalancesResponse = {
  chainId: number;
  walletAddress: string;
  items: BalanceItem[];
};

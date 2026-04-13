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

export type DestinationRouteItem = {
  routeId: string;
  token: TokenVariant;
  provider: MappingProvider;
  bestPriority: number;
};

export type DestinationTokensResponse = {
  sourceTokenId: string;
  items: DestinationRouteItem[];
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

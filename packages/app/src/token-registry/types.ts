export type Address = `0x${string}`;

/** `${chainId}:${lowercaseAddress}` — native tokens use the zero address */
export type TokenId = `${number}:${Address}`;

export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export type Token = {
  id: TokenId;
  chainId: number;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
};

export type ChainTokens = Record<TokenId, Token>;

/**
 * Wire format of /api/tokens/[chainId]: `id` and `chainId` are derivable
 * from the endpoint, so they are stripped server-side and re-derived during
 * client hydration (see view.ts).
 */
export type TokenPayload = Omit<Token, 'id' | 'chainId'>;

export type ProviderId = 'canonical' | 'cctp' | 'layerzero' | 'lifi';

export type LayerZeroRouteData = {
  destination: Address;
  oftAdapter: Address;
  endpointId: number;
};

export type ProviderRoutes =
  | { provider: 'canonical'; routes: Record<Address, Address> }
  | { provider: 'cctp'; routes: Record<Address, Address> }
  | { provider: 'layerzero'; routes: Record<Address, LayerZeroRouteData> }
  | {
      provider: 'lifi';
      /**
       * source → same-asset counterpart (coinKey match); null → swap-only.
       * The pair's swap destination set is a separate, lazily-fetched
       * resource (see /api/token-registry/swap-destinations).
       */
      routes: Record<Address, Address | null>;
    };

export type RouteMapArtifact = {
  sourceChainId: number;
  destinationChainId: number;
  /** only providers that serve this pair */
  providers: ProviderRoutes[];
};

export type RouteOption =
  | {
      provider: 'canonical';
      sourceTokenId: TokenId;
      destinationTokenId: TokenId;
    }
  | { provider: 'cctp'; sourceTokenId: TokenId; destinationTokenId: TokenId }
  | {
      provider: 'layerzero';
      sourceTokenId: TokenId;
      destinationTokenId: TokenId;
      oftAdapter: Address;
      destinationEndpointId: number;
    }
  | {
      provider: 'lifi';
      sourceTokenId: TokenId;
      /** same-asset counterpart; undefined → swap-only */
      destinationTokenId?: TokenId;
    };

/** Result of canonical.resolve(); also the import API response */
export type ImportResolution = {
  tokens: Token[];
  routes: RouteOption[];
};

export type ChainPair = {
  sourceChainId: number;
  destinationChainId: number;
};

export function toTokenId(chainId: number, address: string): TokenId {
  return `${chainId}:${address.toLowerCase() as Address}`;
}

export function addressFromTokenId(id: TokenId): Address {
  return id.slice(id.indexOf(':') + 1) as Address;
}

export function isNativeToken(token: Token): boolean {
  return token.address === NATIVE_TOKEN_ADDRESS;
}

export function pairKey({ sourceChainId, destinationChainId }: ChainPair) {
  return `${sourceChainId}->${destinationChainId}`;
}

import type { Address } from 'viem';

export type { Address } from 'viem';

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

export type ProviderId = 'canonical' | 'layerzero' | 'lifi';

export type BatchDeposit = {
  sourceToken: Token;
  destinationToken: Token;
};

export type RouteOption =
  | {
      provider: 'canonical';
      sourceToken: Token;
      destinationToken: Token;
      batchDeposit?: BatchDeposit;
    }
  | {
      provider: 'layerzero';
      sourceToken: Token;
      destinationToken: Token;
      oftAdapter: Address;
      destinationEndpointId: number;
    }
  | {
      provider: 'lifi';
      sourceToken: Token;
      destinationToken?: Token;
    };

// The client sorts `tokens` by balance and keeps `pinnedTokens` above them, in this order.
export type PickerTokens = {
  pinnedTokens: Token[];
  tokens: Token[];
};

export type SelectedTokenAvailability = {
  sourceToken: Token;
  destinationToken: Token;
  availableRoutes: RouteOption[];
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

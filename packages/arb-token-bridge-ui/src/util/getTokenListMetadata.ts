import { TokenInfo } from '@uniswap/token-lists';

export function getTokenListMetadata(token: Pick<TokenInfo, 'extensions'>) {
  const priceUSD = token.extensions?.priceUSD;

  return {
    priceUSD:
      typeof priceUSD === 'number'
        ? priceUSD
        : typeof priceUSD === 'string'
          ? Number(priceUSD)
          : undefined,
  };
}

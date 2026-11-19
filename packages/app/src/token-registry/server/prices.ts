import { getLifiTokenRegistry } from '../../app/api/crosschain-transfers/lifi/tokens/registry';
import { TopToken, tokenKey } from '../registryFiles';

// The most tokens one price request reads: the two selected tokens and the native tokens of
// their chains.
export const PRICE_REQUEST_LIMIT = 20;

// LiFi's USD price of each token that has one, keyed by tokenKey. The LiFi token registry covers
// the bridge's LiFi chains only, so a token on another chain has no price.
// A caller can start reading the registry before it knows the tokens.
export async function getTokenPrices(
  tokens: Pick<TopToken, 'chainId' | 'address'>[],
  registry = getLifiTokenRegistry(),
): Promise<Record<string, number>> {
  const { tokensByChain } = await registry;
  const wanted = new Set(tokens.map(tokenKey));
  const chainIds = new Set(tokens.map((token) => token.chainId));
  const prices: Record<string, number> = {};
  for (const chainId of chainIds) {
    for (const token of tokensByChain[chainId] ?? []) {
      const key = tokenKey({ chainId, address: token.address });
      const price = Number(token.priceUSD);
      if (wanted.has(key) && !Number.isNaN(price) && price > 0) {
        prices[key] = price;
      }
    }
  }
  return prices;
}

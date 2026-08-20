import { logger } from '../util/logger';

/**
 * Reads the indexer base URL for `chainId` out of `INDEXER_API_URL_BY_CHAIN`, a
 * JSON object keyed by chain ID (`{"42161":"https://indexer.example"}`). Chains
 * are split across separate indexer deployments, so there is no single host.
 *
 * A chain's entry must point at the deployment serving that chain — both its
 * CCTP replica and its bridge history. CCTP looks up both the parent and the
 * child chain of a transfer; bridge history looks up the child chain only.
 *
 * Returns `undefined` for anything unusable — unparseable JSON, a chain that
 * isn't in the map, a value that isn't a URL. Callers decide what that means:
 * CCTP degrades to the subgraph, the bridge history proxy fails the request.
 */
export function getIndexerApiUrl(chainId: number): string | undefined {
  let urlByChainId: Record<string, unknown>;

  try {
    const parsed: unknown = JSON.parse(process.env.INDEXER_API_URL_BY_CHAIN || '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('expected a JSON object keyed by chain ID');
    }
    urlByChainId = parsed as Record<string, unknown>;
  } catch (error) {
    logger.error('[getIndexerApiUrl] cannot parse "INDEXER_API_URL_BY_CHAIN"', error);
    return undefined;
  }

  const url = urlByChainId[String(chainId)];
  if (typeof url !== 'string' || url === '') {
    return undefined;
  }

  // Trailing slash trimmed: some proxies and CDNs treat the `//api/v1/...` it
  // would produce as a different, missing path.
  const baseUrl = url.replace(/\/+$/, '');
  return URL.canParse(baseUrl) ? baseUrl : undefined;
}

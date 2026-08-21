import { logger } from '../util/logger';

/**
 * Indexer base URL for `chainId` from `INDEXER_API_URL_BY_CHAIN`
 * (`{"42161":"https://indexer.example"}`) — chains sit on separate deployments,
 * so each entry must serve that chain's CCTP replica and bridge history.
 * `undefined` for anything unusable; callers pick their own failure mode.
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

  // Some proxies read the resulting `//api/v1/...` as a different, missing path.
  const baseUrl = url.replace(/\/+$/, '');
  return URL.canParse(baseUrl) ? baseUrl : undefined;
}

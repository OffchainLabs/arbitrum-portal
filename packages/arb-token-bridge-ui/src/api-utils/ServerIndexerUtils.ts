import { logger } from '../util/logger';

/**
 * Indexer base URL for `chainId` from `INDEXER_API_URL_BY_CHAIN`
 * (`{"42161":"https://indexer.example"}`) — chains sit on separate deployments,
 * so each entry must serve that chain's CCTP replica and bridge history.
 * `undefined` for anything unusable; callers pick their own failure mode.
 */
export function getIndexerApiUrl(chainId: number): string | undefined {
  const rawUrl = readUrlByChainId().get(String(chainId));

  return typeof rawUrl === 'string' ? toFetchableBaseUrl(rawUrl) : undefined;
}

function readUrlByChainId(): Map<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(process.env.INDEXER_API_URL_BY_CHAIN || '{}');

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('expected a JSON object keyed by chain ID');
    }

    return new Map(Object.entries(parsed));
  } catch (error) {
    logger.error('[getIndexerApiUrl] cannot parse "INDEXER_API_URL_BY_CHAIN"', error);
    return new Map();
  }
}

/**
 * `undefined` unless `fetch` can actually use this. Parseability alone isn't
 * enough: `ftp://host` parses, and `localhost:3000` parses as a custom scheme,
 * so both would read as configured while every request against them fails.
 */
function toFetchableBaseUrl(rawUrl: string): string | undefined {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return undefined;
  }

  // Some proxies read the resulting `//api/v1/...` as a different, missing path.
  return rawUrl.replace(/\/+$/, '');
}

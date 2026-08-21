import { NextRequest, NextResponse } from 'next/server';

import { getIndexerApiUrl } from '../../api-utils/ServerIndexerUtils';
import { logger } from '../../util/logger';
import { isChildChainIndexed } from '../../util/txHistory/sources';

// Always resolved by child chain: a parent's entry may name another deployment.
function getChildChainIdFromRequest(request: NextRequest): number | undefined {
  const l2ChainId = new URL(request.url).searchParams.get('l2ChainId');

  return l2ChainId ? Number(l2ChainId) : undefined;
}

export function isIndexerEnabledForRequest(request: NextRequest): boolean {
  const childChainId = getChildChainIdFromRequest(request);

  return typeof childChainId === 'undefined' ? false : isChildChainIndexed(childChainId);
}

function buildIndexerBridgeHistoryUrl(
  request: NextRequest,
  indexerApiBaseUrl: string,
  path: string,
) {
  const requestUrl = new URL(request.url);
  return `${indexerApiBaseUrl}${path}?${requestUrl.searchParams.toString()}`;
}

export async function proxyToIndexer(request: NextRequest, path: string) {
  const childChainId = getChildChainIdFromRequest(request);
  const indexerUrl =
    typeof childChainId === 'undefined' ? undefined : getIndexerApiUrl(childChainId);

  if (!indexerUrl) {
    logger.error(`[indexer] no "INDEXER_API_URL_BY_CHAIN" entry for chain ${childChainId}`);
    return NextResponse.json(
      { data: [], message: `no indexer configured for chain ${childChainId}` },
      { status: 502 },
    );
  }

  try {
    const upstream = await fetch(buildIndexerBridgeHistoryUrl(request, indexerUrl, path), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const body = await upstream.json();
    return NextResponse.json(body, { status: upstream.status });
  } catch (error) {
    logger.error('[indexer] Proxy to indexer failed:', error);
    return NextResponse.json({ data: [], message: 'Indexer unavailable' }, { status: 502 });
  }
}

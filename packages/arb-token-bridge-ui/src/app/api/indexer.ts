import { NextRequest, NextResponse } from 'next/server';

import { getIndexerApiUrl } from '../../api-utils/ServerIndexerUtils';
import { logger } from '../../util/logger';
import { isChildChainIndexed, parseChainId } from '../../util/txHistory/sources';

// Always resolved by child chain: a parent's entry may name another deployment.
export function getChildChainId(searchParams: URLSearchParams): number | undefined {
  return parseChainId(searchParams.get('l2ChainId'));
}

export function isIndexerEnabledForRequest(request: NextRequest): boolean {
  const childChainId = getChildChainId(new URL(request.url).searchParams);

  return typeof childChainId === 'undefined' ? false : isChildChainIndexed(childChainId);
}

export async function proxyToIndexer(request: NextRequest, path: string) {
  const { searchParams } = new URL(request.url);
  const childChainId = getChildChainId(searchParams);
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
    const upstream = await fetch(`${indexerUrl}${path}?${searchParams.toString()}`, {
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

import { NextRequest, NextResponse } from 'next/server';

import { getIndexerApiUrl } from '../../api-utils/ServerIndexerUtils';
import { logger } from '../../util/logger';
import { isChildChainIndexed, parseChainId } from '../../util/txHistory/sources';

// Always resolved by child chain: a parent's entry may name another deployment.
export function getChildChainId(searchParams: URLSearchParams): number | undefined {
  return parseChainId(searchParams.get('l2ChainId'));
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

/**
 * GET handler for a bridge history route the indexer alone serves. Checks the
 * request first, as the subgraph path did, so a malformed request gets a clear
 * answer here instead of being forwarded.
 */
export function indexerOnlyRoute(path: string) {
  return async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const childChainId = getChildChainId(searchParams);

    if (typeof childChainId === 'undefined') {
      return NextResponse.json({ message: '<l2ChainId> is required', data: [] }, { status: 400 });
    }

    if (!searchParams.get('sender') && !searchParams.get('receiver')) {
      return NextResponse.json(
        { message: '<sender> or <receiver> is required', data: [] },
        { status: 400 },
      );
    }

    const pageSize = Number(searchParams.get('pageSize') || '10');
    if (Number.isNaN(pageSize) || pageSize === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    if (!isChildChainIndexed(childChainId)) {
      return NextResponse.json(
        { message: `unsupported chain: ${childChainId}`, data: [] },
        { status: 400 },
      );
    }

    return proxyToIndexer(request, path);
  };
}

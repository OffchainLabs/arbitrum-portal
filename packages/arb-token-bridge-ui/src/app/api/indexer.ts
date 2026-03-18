import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../util/logger';

export function isIndexerApiExperimentEnabled(request: NextRequest): boolean {
  const experiments = new URL(request.url).searchParams.get('experiments');
  return experiments?.split(',').includes('indexer') ?? false;
}

function buildIndexerBridgeHistoryUrl(request: NextRequest, path: string) {
  const requestUrl = new URL(request.url);
  const indexerApiBaseUrl = process.env.INDEXER_API_URL;
  requestUrl.searchParams.delete('experiments');
  return `${indexerApiBaseUrl}${path}?${requestUrl.searchParams.toString()}`;
}

export async function proxyToIndexer(request: NextRequest, path: string) {
  const indexerUrl = process.env.INDEXER_API_URL;
  if (!indexerUrl) {
    logger.error('[indexer] INDEXER_API_URL is not set');
    return NextResponse.json({ data: [], message: 'INDEXER_API_URL is not set' }, { status: 502 });
  }

  try {
    const upstream = await fetch(buildIndexerBridgeHistoryUrl(request, path), {
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

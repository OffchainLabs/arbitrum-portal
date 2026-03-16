import { NextRequest, NextResponse } from 'next/server';

import { loadEnvironmentVariableWithFallback } from '../../util';

export function shouldUseIndexer(request: NextRequest): boolean {
  const experiments = new URL(request.url).searchParams.get('experiments');
  return experiments?.split(',').includes('indexer') ?? false;
}

function buildIndexerBridgeHistoryUrl(request: NextRequest, path: string) {
  const requestUrl = new URL(request.url);
  const indexerApiBaseUrl = loadEnvironmentVariableWithFallback({
    env: process.env.INDEXER_API_URL,
    fallback: process.env.NEXT_PUBLIC_INDEXER_URL,
  });
  requestUrl.searchParams.delete('experiments');
  return `${indexerApiBaseUrl}${path}?${requestUrl.searchParams.toString()}`;
}

export async function proxyToIndexer(request: NextRequest, path: string) {
  try {
    const upstream = await fetch(buildIndexerBridgeHistoryUrl(request, path), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const body = await upstream.json();
    return NextResponse.json(body, { status: upstream.status });
  } catch {
    return NextResponse.json({ data: [], message: 'Indexer unavailable' }, { status: 502 });
  }
}

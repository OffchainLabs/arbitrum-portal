import { NextRequest, NextResponse } from 'next/server';

import { loadEnvironmentVariableWithFallback } from '../../util';

function hasIndexerExperiment(search: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const experiments = params.get('experiments');

  if (!experiments) {
    return false;
  }

  return experiments.split(',').includes('indexer');
}

export function shouldUseIndexer(request: NextRequest): boolean {
  const referer = request.headers.get('referer');

  if (typeof referer === 'string') {
    return hasIndexerExperiment(new URL(referer).search);
  }

  return hasIndexerExperiment(new URL(request.url).search);
}

function buildIndexerBridgeHistoryUrl(request: NextRequest, path: string) {
  const requestUrl = new URL(request.url);
  const indexerApiBaseUrl = loadEnvironmentVariableWithFallback({
    env: process.env.INDEXER_API_URL,
    fallback: process.env.NEXT_PUBLIC_INDEXER_URL,
  });

  return `${indexerApiBaseUrl}${path}?${requestUrl.searchParams.toString()}`;
}

export async function proxyToIndexer(request: NextRequest, path: string) {
  const upstream = await fetch(buildIndexerBridgeHistoryUrl(request, path), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const body = await upstream.json();
  return NextResponse.json(body, { status: upstream.status });
}

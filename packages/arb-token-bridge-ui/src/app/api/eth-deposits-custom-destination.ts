import { NextRequest, NextResponse } from 'next/server';

import { getChildChainId, isIndexerEnabledForRequest, proxyToIndexer } from './indexer';

export async function GET(request: NextRequest) {
  if (!isIndexerEnabledForRequest(request)) {
    const childChainId = getChildChainId(new URL(request.url).searchParams);

    return NextResponse.json(
      { message: `unsupported chain: ${childChainId}`, data: [] },
      { status: 400 },
    );
  }

  return proxyToIndexer(request, '/api/bridge-history/eth-deposits-custom-destination');
}

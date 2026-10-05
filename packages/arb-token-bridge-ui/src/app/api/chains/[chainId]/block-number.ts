import { NextResponse } from 'next/server';

import { getIndexerApiUrl } from '../../../../api-utils/ServerIndexerUtils';
import { type SubgraphSource } from '../../../../api-utils/ServerSubgraphUtils';
import { isChildChainIndexed } from '../../../../util/txHistory/sources';

type IndexerStatus = Record<string, { id: string; block: { number: number } }>;

/** Callers read this as "nothing is indexed here" and scan event logs instead. */
const NO_INDEXED_BLOCK = 0;

async function fetchIndexerBlockNumber(chainId: number): Promise<number> {
  const indexerUrl = getIndexerApiUrl(chainId);
  if (!indexerUrl) {
    return 0;
  }

  const response = await fetch(`${indexerUrl}/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    return 0;
  }

  const status = (await response.json()) as IndexerStatus;
  const chain = Object.values(status).find((entry) => Number(entry.id) === chainId);

  return chain?.block?.number ?? 0;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chainId: string }> },
): Promise<
  NextResponse<{ data: number; meta?: { source: SubgraphSource } } | { message: string }>
> {
  const { chainId } = await params;
  const numericChainId = Number(chainId);

  if (!isChildChainIndexed(numericChainId)) {
    return NextResponse.json({ data: NO_INDEXED_BLOCK }, { status: 200 });
  }

  try {
    const indexerBlockNumber = await fetchIndexerBlockNumber(numericChainId);

    if (indexerBlockNumber === 0) {
      return NextResponse.json(
        { message: 'Unable to fetch indexer block number' },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        meta: { source: 'arbitrum-indexer' },
        data: indexerBlockNumber,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: (error as Error)?.message ?? 'Something went wrong' },
      { status: 502 },
    );
  }
}

import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';

import { getIndexerApiUrl } from '../../../../api-utils/ServerIndexerUtils';
import {
  type SubgraphSource,
  getL2SubgraphClient,
} from '../../../../api-utils/ServerSubgraphUtils';
import { ChainId } from '../../../../types/ChainId';
import { logger } from '../../../../util/logger';
import { isChildChainIndexed } from '../../../../util/txHistory/sources';

type IndexerStatus = Record<string, { id: string; block: { number: number } }>;

/** Callers read this as "nothing is indexed here" and scan event logs instead. */
const NO_INDEXED_BLOCK = 0;

// Throws rather than answering 0: for an indexed chain, 0 would send callers to a
// full event-log scan. Each failure names its cause so a missing config entry
// isn't mistaken for an indexer outage.
async function fetchIndexerBlockNumber(
  chainId: number,
  configuredChildChainId = chainId,
): Promise<number> {
  const indexerUrl = getIndexerApiUrl(configuredChildChainId);
  if (!indexerUrl) {
    throw new Error(
      `No indexer configured for chain ${chainId} via child chain ${configuredChildChainId}`,
    );
  }

  const response = await fetch(`${indexerUrl}/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Indexer status failed with ${response.status} for chain ${chainId}`);
  }

  const status = (await response.json()) as IndexerStatus;
  const chain = Object.values(status).find((entry) => Number(entry.id) === chainId);
  const blockNumber = chain?.block?.number;

  if (!blockNumber) {
    throw new Error(`Indexer status does not report chain ${chainId}`);
  }

  return blockNumber;
}

function getSubgraphClient(chainId: number) {
  switch (chainId) {
    case ChainId.ArbitrumOne:
      return getL2SubgraphClient(ChainId.ArbitrumOne);

    case ChainId.ArbitrumNova:
      return getL2SubgraphClient(ChainId.ArbitrumNova);

    case ChainId.ArbitrumSepolia:
      return getL2SubgraphClient(ChainId.ArbitrumSepolia);

    default:
      return undefined;
  }
}

function getIndexerConfigChainId(chainId: number): number | undefined {
  if (chainId === ChainId.Ethereum) return ChainId.ArbitrumOne;
  if (chainId === ChainId.Sepolia) return ChainId.ArbitrumSepolia;
  return isChildChainIndexed(chainId) ? chainId : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chainId: string }> },
): Promise<
  NextResponse<{ data: number; meta?: { source: SubgraphSource } } | { message: string }>
> {
  const { chainId } = await params;
  const numericChainId = Number(chainId);

  try {
    const indexerConfigChainId = getIndexerConfigChainId(numericChainId);
    if (typeof indexerConfigChainId !== 'undefined') {
      const indexerBlockNumber = await fetchIndexerBlockNumber(
        numericChainId,
        indexerConfigChainId,
      );

      return NextResponse.json(
        {
          meta: { source: 'arbitrum-indexer' },
          data: indexerBlockNumber,
        },
        { status: 200 },
      );
    }

    const subgraph = getSubgraphClient(numericChainId);

    if (!subgraph) {
      return NextResponse.json({ data: NO_INDEXED_BLOCK }, { status: 200 });
    }

    const result: {
      data: {
        _meta: {
          block: {
            number: number;
          };
        };
      };
    } = await subgraph.client.query({
      query: gql`
        {
          _meta {
            block {
              number
            }
          }
        }
      `,
    });

    return NextResponse.json(
      {
        meta: { source: subgraph.source },
        data: result.data._meta.block.number,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error('[block-number] failed to fetch latest indexed block', {
      chainId: numericChainId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: 'Unable to fetch latest indexed block' }, { status: 502 });
  }
}

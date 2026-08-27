import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';

import { getIndexerApiUrl } from '../../../../api-utils/ServerIndexerUtils';
import {
  type SubgraphSource,
  getL1SubgraphClient,
  getL2SubgraphClient,
} from '../../../../api-utils/ServerSubgraphUtils';
import { ChainId } from '../../../../types/ChainId';
import { isChildChainIndexed } from '../../../../util/txHistory/sources';

type IndexerStatus = Record<string, { id: string; block: { number: number } }>;

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

// Nova only: every other chain's block number comes from the indexer above. The
// sole caller (`fetchLatestIndexedBlockNumber`) always asks for a child chain, so
// Ethereum resolves through Nova's parent subgraph and Sepolia has nothing left.
function getSubgraphClient(chainId: number) {
  switch (chainId) {
    case ChainId.Ethereum:
      return getL1SubgraphClient(ChainId.ArbitrumNova);

    case ChainId.ArbitrumNova:
      return getL2SubgraphClient(ChainId.ArbitrumNova);

    default:
      throw new Error(`[getSubgraphClient] unsupported chain id: ${chainId}`);
  }
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
    if (isChildChainIndexed(numericChainId)) {
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
    }

    const subgraph = getSubgraphClient(numericChainId);

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
    return NextResponse.json({ data: 0 }, { status: 200 });
  }
}

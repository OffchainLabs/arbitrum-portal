import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';

import {
  getL1SubgraphClient,
  getL2SubgraphClient,
  getSourceFromSubgraphClient,
} from '../../../../api-utils/ServerSubgraphUtils';
import { ChainId } from '../../../../types/ChainId';
import { isChildChainIndexed } from '../../../../util/txHistory/sources';

type IndexerStatus = Record<string, { id: number; block: { number: number } }>;

async function fetchIndexerBlockNumber(chainId: number): Promise<number> {
  const indexerUrl = process.env.INDEXER_API_URL;
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

function getSubgraphClient(chainId: number) {
  switch (chainId) {
    case ChainId.Ethereum:
      // it's the same whether we do arb1 or nova
      return getL1SubgraphClient(ChainId.ArbitrumOne);

    case ChainId.Sepolia:
      return getL1SubgraphClient(ChainId.ArbitrumSepolia);

    case ChainId.ArbitrumOne:
      return getL2SubgraphClient(ChainId.ArbitrumOne);

    case ChainId.ArbitrumNova:
      return getL2SubgraphClient(ChainId.ArbitrumNova);

    case ChainId.ArbitrumSepolia:
      return getL2SubgraphClient(ChainId.ArbitrumSepolia);

    default:
      throw new Error(`[getSubgraphClient] unsupported chain id: ${chainId}`);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chainId: string }> },
): Promise<NextResponse<{ data: number; meta?: { source: string | null } } | { message: string }>> {
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

    const subgraphClient = getSubgraphClient(numericChainId);

    const result: {
      data: {
        _meta: {
          block: {
            number: number;
          };
        };
      };
    } = await subgraphClient.query({
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
        meta: { source: getSourceFromSubgraphClient(subgraphClient) },
        data: result.data._meta.block.number,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ data: 0 }, { status: 200 });
  }
}

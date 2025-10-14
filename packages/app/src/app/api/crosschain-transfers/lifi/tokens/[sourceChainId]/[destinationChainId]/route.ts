import { CoinKey } from '@lifi/sdk';
import { NextResponse } from 'next/server';

import {
  type LifiTokenInfo,
  type LifiTokensApiResponse,
  type LifiTransferToken,
} from '@/bridge/app/api/crosschain-transfers/lifiTokens';
import { ChainId } from '@/bridge/types/ChainId';

import {
  ALLOWED_DESTINATION_CHAIN_IDS,
  ALLOWED_SOURCE_CHAIN_IDS,
  LifiTokenWithCoinKey,
  getLifiTokenRegistry,
} from '../../registry';

export const dynamic = 'force-static';
export const revalidate = 60 * 60; // 1 hour

type RouteParams = {
  sourceChainId: string;
  destinationChainId: string;
};

const stripCoinKey = ({ coinKey, ...token }: LifiTokenWithCoinKey): LifiTokenInfo => token;

type MapTokensParams = {
  sourceTokens: LifiTokenWithCoinKey[];
  destinationTokensByCoinKey: Record<string, LifiTokenWithCoinKey>;
  destinationChainId: number;
};

export const mapSourceTokensToTransferTokens = ({
  sourceTokens,
  destinationTokensByCoinKey,
  destinationChainId,
}: MapTokensParams): LifiTransferToken[] => {
  return sourceTokens.reduce<LifiTransferToken[]>((acc, token) => {
    const destinationToken =
      destinationChainId === ChainId.ApeChain && token.coinKey === CoinKey.ETH
        ? destinationTokensByCoinKey[CoinKey.WETH]
        : destinationTokensByCoinKey[token.coinKey];

    if (!destinationToken) {
      return acc;
    }

    acc.push({
      ...stripCoinKey(token),
      destinationToken: stripCoinKey(destinationToken),
    });

    return acc;
  }, []);
};

export async function GET(
  _request: Request,
  { params }: { params: RouteParams },
): Promise<NextResponse<LifiTokensApiResponse>> {
  const sourceChainId = Number(params.sourceChainId);
  const destinationChainId = Number(params.destinationChainId);

  if (
    !ALLOWED_SOURCE_CHAIN_IDS.includes(sourceChainId) ||
    !ALLOWED_DESTINATION_CHAIN_IDS.includes(destinationChainId)
  ) {
    return NextResponse.json(
      { message: 'Chain pair not supported for LiFi tokens' },
      { status: 400 },
    );
  }

  try {
    const { tokensByChain, tokensByChainAndCoinKey } = await getLifiTokenRegistry();

    const sourceTokens = tokensByChain[sourceChainId] ?? [];
    const destinationTokensByCoinKey = tokensByChainAndCoinKey[destinationChainId];

    if (
      !sourceTokens.length ||
      !destinationTokensByCoinKey ||
      Object.keys(destinationTokensByCoinKey).length === 0
    ) {
      return NextResponse.json(
        {
          data: [],
        },
        { status: 200 },
      );
    }

    const tokens = mapSourceTokensToTransferTokens({
      sourceTokens,
      destinationTokensByCoinKey,
      destinationChainId,
    });

    return NextResponse.json({ data: tokens }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message ?? 'Unable to load LiFi tokens',
      },
      { status: 500 },
    );
  }
}

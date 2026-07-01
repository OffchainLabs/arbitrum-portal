import { TokenList } from '@uniswap/token-lists';
import { NextRequest, NextResponse } from 'next/server';

import {
  allowedLifiDestinationChainIds,
  allowedLifiSourceChainIds,
  lifiDestinationChainIds,
} from '@/bridge/app/api/crosschain-transfers/constants';
import { ChainId } from '@/bridge/types/ChainId';
import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { groupChildTokensAndParentTokens } from './groupChildTokensAndParentTokens';
import { type LifiTokenWithCoinKey, getLifiTokenRegistry } from './registry';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

const TOKEN_LIST_NAME = 'LiFi Transfer Tokens';
const TOKEN_LIST_VERSION = { major: 1, minor: 0, patch: 0 };

const BASE_TOKEN_LIST = {
  name: TOKEN_LIST_NAME,
  timestamp: new Date().toISOString(),
  version: TOKEN_LIST_VERSION,
  logoURI: '/icons/lifi.svg',
} as const;

const ROBINHOOD_SOURCE_TOKEN_ADDRESSES = new Set(
  [
    CommonAddress.RobinhoodChain.WETH,
    CommonAddress.RobinhoodChain.USDe,
    CommonAddress.RobinhoodChain.sUSDe,
    CommonAddress.RobinhoodChain.USDG,
    CommonAddress.RobinhoodChain.ENA,
    CommonAddress.RobinhoodChain.WEETH,
    CommonAddress.RobinhoodChain.WSTETH,
  ].map((address) => address.toLowerCase()),
);

const parseChainParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

function getParentTokensForRoute({
  parentChainId,
  tokens,
}: {
  parentChainId: number;
  tokens: LifiTokenWithCoinKey[];
}) {
  if (parentChainId !== ChainId.RobinhoodChain) {
    return tokens;
  }

  return tokens.filter((token) =>
    ROBINHOOD_SOURCE_TOKEN_ADDRESSES.has(token.address.toLowerCase()),
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<TokenList>> {
  const { searchParams } = new URL(request.url);
  const parentChainId = parseChainParam(searchParams.get('parentChainId'));
  const childChainId = parseChainParam(searchParams.get('childChainId'));

  const isInvalidChainId = parentChainId === null || childChainId === null;
  const isInvalidSourceChain = !allowedLifiSourceChainIds.includes(parentChainId!);
  const isInvalidDestinationChain = !allowedLifiDestinationChainIds.includes(childChainId!);
  const isInvalidLifiRoute = !lifiDestinationChainIds[parentChainId!]?.includes(childChainId!);

  if (isInvalidChainId || isInvalidSourceChain || isInvalidDestinationChain || isInvalidLifiRoute) {
    return NextResponse.json(
      {
        ...BASE_TOKEN_LIST,
        tokens: [],
      },
      {
        status: 400,
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60',
        },
      },
    );
  }

  try {
    const { tokensByChain, tokensByChainAndCoinKey } = await getLifiTokenRegistry();

    const parentTokens = getParentTokensForRoute({
      parentChainId,
      tokens: tokensByChain[parentChainId] ?? [],
    });
    const childTokensByCoinKey = tokensByChainAndCoinKey[childChainId];

    if (
      !parentTokens.length ||
      !childTokensByCoinKey ||
      Object.keys(childTokensByCoinKey).length === 0
    ) {
      return NextResponse.json(
        {
          ...BASE_TOKEN_LIST,
          tokens: [],
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=0',
          },
        },
      );
    }

    const tokens = groupChildTokensAndParentTokens({
      parentTokens,
      childTokensByCoinKey,
      parentChainId,
      childChainId,
    });

    return NextResponse.json(
      {
        ...BASE_TOKEN_LIST,
        tokens,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=0',
        },
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ...BASE_TOKEN_LIST,
        tokens: [],
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60',
        },
      },
    );
  }
}

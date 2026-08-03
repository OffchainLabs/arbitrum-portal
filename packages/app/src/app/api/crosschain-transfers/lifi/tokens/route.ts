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
const EMPTY_TOKEN_LIST_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=60',
};
const TOKEN_LIST_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=0',
};

const BASE_TOKEN_LIST = {
  name: TOKEN_LIST_NAME,
  timestamp: new Date().toISOString(),
  version: TOKEN_LIST_VERSION,
  logoURI: '/icons/lifi.svg',
} as const;

function createEmptyTokenListResponse(status: 400 | 500): NextResponse<TokenList> {
  return NextResponse.json(
    {
      ...BASE_TOKEN_LIST,
      tokens: [],
    },
    {
      status,
      headers: EMPTY_TOKEN_LIST_CACHE_HEADERS,
    },
  );
}

function createTokenListResponse(tokens: TokenList['tokens']): NextResponse<TokenList> {
  return NextResponse.json(
    {
      ...BASE_TOKEN_LIST,
      tokens,
    },
    {
      status: 200,
      headers: TOKEN_LIST_CACHE_HEADERS,
    },
  );
}

const ROBINHOOD_SOURCE_TOKEN_ADDRESSES = new Set(
  [
    CommonAddress.RobinhoodChain.WETH,
    CommonAddress.RobinhoodChain.USDe,
    CommonAddress.RobinhoodChain.sUSDe,
    CommonAddress.RobinhoodChain.USDG,
    CommonAddress.RobinhoodChain.ENA,
    CommonAddress.RobinhoodChain.WEETH,
    CommonAddress.RobinhoodChain.WSTETH,
    CommonAddress.RobinhoodChain.SFI,
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

  if (parentChainId === null || childChainId === null) {
    return createEmptyTokenListResponse(400);
  }

  const isInvalidSourceChain = !allowedLifiSourceChainIds.includes(parentChainId);
  const isInvalidDestinationChain = !allowedLifiDestinationChainIds.includes(childChainId);
  const isInvalidLifiRoute = !lifiDestinationChainIds[parentChainId]?.includes(childChainId);

  if (isInvalidSourceChain || isInvalidDestinationChain || isInvalidLifiRoute) {
    return createEmptyTokenListResponse(400);
  }

  try {
    const { tokensByChain, tokensByChainAndCoinKey, unpairedTokensByChain } =
      await getLifiTokenRegistry();

    const parentTokens = getParentTokensForRoute({
      parentChainId,
      tokens: tokensByChain[parentChainId] ?? [],
    });
    const childTokensByCoinKey = tokensByChainAndCoinKey[childChainId] ?? {};

    const groupedTokens =
      parentTokens.length && Object.keys(childTokensByCoinKey).length > 0
        ? groupChildTokensAndParentTokens({
            parentTokens,
            childTokensByCoinKey,
            parentChainId,
            childChainId,
          })
        : [];
    const tokenKeys = new Set(
      groupedTokens.map((token) => `${token.chainId}:${token.address.toLowerCase()}`),
    );
    const unpairedSourceTokens = (unpairedTokensByChain[parentChainId] ?? [])
      .map((token) => ({
        chainId: parentChainId,
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI,
        extensions: {
          ...(token.priceUSD ? { priceUSD: token.priceUSD } : {}),
        },
      }))
      .filter((token) => !tokenKeys.has(`${token.chainId}:${token.address.toLowerCase()}`));
    const tokens = groupedTokens.concat(unpairedSourceTokens);

    return createTokenListResponse(tokens);
  } catch (error: unknown) {
    return createEmptyTokenListResponse(500);
  }
}

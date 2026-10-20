import { TokenInfo } from '@uniswap/token-lists';
import { bench, describe } from 'vitest';

import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types';
import { ChainId } from '../../types/ChainId';
import {
  LIFI_TRANSFER_LIST_ID,
  SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID,
  TokenListWithId,
  tokenListTokenToBridgeToken,
} from '../../util/TokenListUtils';
import { mergeBridgeTokens } from '../../util/mergeBridgeTokens';
import { tokenListsToSearchableTokenStorage } from './TokenSearchUtils';

const parentChainId = ChainId.Ethereum;
const childChainId = ChainId.ArbitrumOne;

// Deterministic, so every run measures the same input
function getAddress(chainId: number, index: number) {
  return `0x${chainId.toString(16).padStart(8, '0')}${index.toString(16).padStart(32, '0')}`;
}

function getParentToken(index: number): TokenInfo {
  return {
    chainId: parentChainId,
    address: getAddress(parentChainId, index),
    name: `Token ${index}`,
    symbol: `TKN${index}`,
    decimals: 18,
    logoURI: `https://assets.coingecko.com/coins/images/${index}/thumb/logo.png`,
  };
}

function getChildToken(index: number): TokenInfo {
  return {
    ...getParentToken(index),
    chainId: childChainId,
    address: getAddress(childChainId, index),
    extensions: {
      bridgeInfo: {
        [parentChainId]: {
          tokenAddress: getAddress(parentChainId, index),
          originBridgeAddress: getAddress(childChainId, 0),
          destBridgeAddress: getAddress(parentChainId, 0),
        },
      },
    },
  };
}

function getLifiToken(index: number): TokenInfo {
  const token = index % 2 === 0 ? getParentToken(index) : getChildToken(index);
  return { ...token, extensions: { ...token.extensions, priceUSD: '1.23' } };
}

function getRange(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => start + index);
}

function getTokenList(id: string, tokens: TokenInfo[]): TokenListWithId {
  return {
    name: id,
    timestamp: '2026-01-01T00:00:00.000Z',
    version: { major: 1, minor: 0, patch: 0 },
    l2ChainId: String(childChainId),
    bridgeTokenListId: id,
    tokens,
  };
}

// Sizes and overlap of the Arbitrum One lists (tokenlist.arbitrum.io) and the LiFi list
const tokenLists: TokenListWithId[] = [
  getTokenList(SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID, [getParentToken(0), getChildToken(0)]),
  getTokenList('1', [
    ...getRange(0, 100).map(getParentToken),
    ...getRange(0, 99).map(getChildToken),
  ]),
  getTokenList('2', getRange(0, 190).map(getChildToken)),
  getTokenList('4', getRange(0, 668).map(getChildToken)),
  getTokenList('5', getRange(300, 830).map(getChildToken)),
  getTokenList(LIFI_TRANSFER_LIST_ID, getRange(0, 200).map(getLifiToken)),
];
const tokenCount = tokenLists.reduce((count, tokenList) => count + tokenList.tokens.length, 0);

const bridgeTokens = tokenLists.flatMap((tokenList) =>
  tokenList.tokens.flatMap((token) => {
    const bridgeToken = tokenListTokenToBridgeToken({
      token,
      listId: tokenList.bridgeTokenListId,
      parentChainId,
      childChainId,
    });
    return bridgeToken ? [{ bridgeToken, listId: tokenList.bridgeTokenListId }] : [];
  }),
);

describe('token list ingestion', () => {
  bench(`tokenListsToSearchableTokenStorage, ${tokenLists.length} lists`, () => {
    tokenListsToSearchableTokenStorage(tokenLists, String(parentChainId), String(childChainId));
  });

  bench(`tokenListTokenToBridgeToken, ${tokenCount} tokens`, () => {
    tokenLists.forEach((tokenList) =>
      tokenList.tokens.forEach((token) =>
        tokenListTokenToBridgeToken({
          token,
          listId: tokenList.bridgeTokenListId,
          parentChainId,
          childChainId,
        }),
      ),
    );
  });

  bench(`mergeBridgeTokens, ${bridgeTokens.length} tokens`, () => {
    const storage: Record<string, ERC20BridgeToken> = {};
    bridgeTokens.forEach(({ bridgeToken, listId }) => {
      storage[bridgeToken.address] = mergeBridgeTokens({
        existingToken: storage[bridgeToken.address],
        incomingToken: bridgeToken,
        incomingListId: listId,
      });
    });
  });
});

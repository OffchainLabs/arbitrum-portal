import { TokenList } from '@uniswap/token-lists';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { ContractStorage, ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useLifiTokenList, useTokenLists } from '../../hooks/useTokenLists';
import { useAppState } from '../../state';
import { LIFI_TRANSFER_LIST_ID, TokenListWithId } from '../../util/TokenListUtils';
import { mergeBridgeTokens } from '../../util/mergeBridgeTokens';

// keeps the reference stable
const emptyData: ContractStorage<ERC20BridgeToken> = {};
const emptyTokenLists: TokenListWithId[] = [];

/**
 * Overlays the separately refreshed LiFi token list onto the lists from `useTokenLists`, so the
 * token panel picks up fresh `priceUSD` without the two sharing an SWR key.
 *
 * Returns `tokenLists` unchanged when there is nothing to overlay, since the result feeds an SWR key
 * that deep-hashes every token and a new array identity forces a full re-walk.
 */
export function mergeLifiTokenList({
  tokenLists,
  lifiTokenList,
  childChainId,
}: {
  tokenLists: TokenListWithId[] | undefined;
  lifiTokenList: TokenList | undefined;
  childChainId: number;
}): TokenListWithId[] {
  if (!tokenLists) {
    return emptyTokenLists;
  }

  if (!lifiTokenList) {
    return tokenLists;
  }

  let didReplace = false;
  const merged = tokenLists.map((tokenList) => {
    if (tokenList.bridgeTokenListId !== LIFI_TRANSFER_LIST_ID) {
      return tokenList;
    }

    didReplace = true;
    return { ...tokenList, ...lifiTokenList };
  });

  if (didReplace) {
    return merged;
  }

  /**
   * `fetchTokenLists` drops any list whose fetch returned no data, so a failed LiFi request at load
   * leaves nothing to overlay. Add the refreshed list instead of discarding it.
   */
  return [
    ...merged,
    {
      ...lifiTokenList,
      l2ChainId: String(childChainId),
      bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    },
  ];
}

export function useTokensFromLists() {
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const { data: tokenLists, isLoading: isLoadingTokenLists } = useTokenLists(childChain.id);
  const { data: refreshedLifiTokenList } = useLifiTokenList();

  // Memoized for referential stability: this feeds an SWR key that deep-hashes every token.
  const mergedTokenLists = useMemo(
    () =>
      mergeLifiTokenList({
        tokenLists,
        lifiTokenList: refreshedLifiTokenList,
        childChainId: childChain.id,
      }),
    [tokenLists, refreshedLifiTokenList, childChain.id],
  );

  const { data = emptyData, isLoading } = useSWRImmutable(
    [mergedTokenLists, parentChain.id, childChain.id, 'useTokensFromLists'],
    ([_tokenLists, _parentChainId, _childChainId]) =>
      tokenListsToSearchableTokenStorage(
        _tokenLists,
        String(_parentChainId),
        String(_childChainId),
      ),
  );

  return { data, isLoading: isLoadingTokenLists || isLoading };
}

export function useTokensFromUser(): ContractStorage<ERC20BridgeToken> {
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();
  const emptyData = useMemo(() => ({}), []);

  const { data = emptyData } = useSWRImmutable(
    [bridgeTokens, 'useTokensFromUser'],
    ([_bridgeTokens]) => {
      const storage: ContractStorage<ERC20BridgeToken> = {};

      // Can happen when switching networks.
      if (typeof _bridgeTokens === 'undefined') {
        return {};
      }

      Object.keys(_bridgeTokens).forEach((_address: string) => {
        const bridgeToken = _bridgeTokens[_address];

        // Any tokens in the bridge that don't have a list id were added by the user.
        if (bridgeToken && bridgeToken.listIds.size === 0) {
          storage[_address] = { ...bridgeToken, listIds: new Set() };
        }
      });

      return storage;
    },
  );

  return data;
}

export function tokenListsToSearchableTokenStorage(
  tokenLists: TokenListWithId[],
  l1ChainId: string,
  l2ChainId: string,
): ContractStorage<ERC20BridgeToken> {
  return tokenLists.reduce((acc: ContractStorage<ERC20BridgeToken>, tokenList: TokenListWithId) => {
    tokenList.tokens.forEach((token) => {
      const address = token.address.toLowerCase();
      const stringifiedChainId = String(token.chainId);
      const accAddress = acc[address];

      if (stringifiedChainId === l1ChainId) {
        // The address is from an L1 token
        const priceUSD = token.extensions?.priceUSD as number;
        if (typeof accAddress === 'undefined') {
          // First time encountering the token through its L1 address
          acc[address] = {
            ...token,
            type: TokenType.ERC20,
            l2Address: undefined,
            listIds: new Set(),
            priceUSD,
          };
        } else {
          // Token was already added to the map through its L2 token
          acc[address] = {
            ...accAddress,
            address,
          };
          if (!acc[address]!.priceUSD && priceUSD) {
            acc[address]!.priceUSD = priceUSD;
          }
        }

        // acc[address] was defined in the if/else above
        acc[address]!.listIds.add(tokenList.bridgeTokenListId);
      } else if (stringifiedChainId === l2ChainId) {
        // The token is an L2 token

        if (!token.extensions?.bridgeInfo) {
          return;
        }

        // @ts-ignore TODO
        // TODO: should we upgrade '@uniswap/token-lists'?
        const bridgeInfo: {
          [chainId: string]: { tokenAddress: string };
        } = token.extensions.bridgeInfo;

        const l1Bridge = bridgeInfo[l1ChainId];
        if (l1Bridge) {
          const addressOnL1 = l1Bridge.tokenAddress.toLowerCase();
          const priceUSD = token.extensions?.priceUSD as number;

          if (!addressOnL1) {
            return;
          }

          if (typeof acc[addressOnL1] === 'undefined') {
            // Token is not on the list yet
            acc[addressOnL1] = {
              name: token.name,
              symbol: token.symbol,
              type: TokenType.ERC20,
              logoURI: token.logoURI,
              address: addressOnL1,
              l2Address: address,
              decimals: token.decimals,
              listIds: new Set(),
              priceUSD,
            };
          } else {
            // Prefer LiFi token metadata when multiple lists map the same L1 token.
            acc[addressOnL1] = mergeBridgeTokens({
              existingToken: acc[addressOnL1],
              incomingToken: {
                name: token.name,
                symbol: token.symbol,
                type: TokenType.ERC20,
                logoURI: token.logoURI,
                address: addressOnL1,
                l2Address: address,
                decimals: token.decimals,
                listIds: acc[addressOnL1]?.listIds || new Set(),
                priceUSD,
              },
              incomingListId: tokenList.bridgeTokenListId,
            });
          }

          // acc[address] was defined in the if/else above
          acc[addressOnL1]!.listIds.add(tokenList.bridgeTokenListId);
        }
      }
    });

    return acc;
  }, {});
}

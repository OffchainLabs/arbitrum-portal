import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { ContractStorage, ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useTokenLists } from '../../hooks/useTokenLists';
import { useAppState } from '../../state';
import { LIFI_TRANSFER_LIST_ID, TokenListWithId } from '../../util/TokenListUtils';
import { getTokenListMetadata } from '../../util/getTokenListMetadata';
import { mergeBridgeTokens } from '../../util/mergeBridgeTokens';

// keeps the reference stable
const emptyData: ContractStorage<ERC20BridgeToken> = {};

export function useTokensFromLists() {
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const { data: tokenLists, isLoading: isLoadingTokenLists } = useTokenLists(childChain.id);

  const { data = emptyData, isLoading } = useSWRImmutable(
    [
      tokenLists ?? [],
      parentChain.id,
      childChain.id,
      networks.sourceChain.id,
      'useTokensFromLists',
    ],
    ([_tokenLists, _parentChainId, _childChainId, _sourceChainId]) =>
      tokenListsToSearchableTokenStorage(
        _tokenLists,
        String(_parentChainId),
        String(_childChainId),
        String(_sourceChainId),
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
  sourceChainId: string,
): ContractStorage<ERC20BridgeToken> {
  return tokenLists.reduce((acc: ContractStorage<ERC20BridgeToken>, tokenList: TokenListWithId) => {
    tokenList.tokens.forEach((token) => {
      const address = token.address.toLowerCase();
      const stringifiedChainId = String(token.chainId);
      const accAddress = acc[address];
      const tokenListMetadata = getTokenListMetadata(token);

      if (stringifiedChainId === l1ChainId) {
        // The address is from an L1 token
        acc[address] = mergeBridgeTokens({
          existingToken: accAddress,
          incomingToken: {
            name: token.name,
            symbol: token.symbol,
            type: TokenType.ERC20,
            address,
            l2Address: accAddress?.l2Address,
            decimals: token.decimals,
            logoURI: token.logoURI,
            listIds: new Set(),
            ...tokenListMetadata,
          },
          incomingListId: tokenList.bridgeTokenListId,
        });
      } else if (stringifiedChainId === l2ChainId) {
        // The token is an L2 token

        if (!token.extensions?.bridgeInfo) {
          if (
            tokenList.bridgeTokenListId === LIFI_TRANSFER_LIST_ID &&
            stringifiedChainId === sourceChainId
          ) {
            acc[address] = mergeBridgeTokens({
              existingToken: accAddress,
              incomingToken: {
                name: token.name,
                symbol: token.symbol,
                type: TokenType.ERC20,
                address,
                l2Address: address,
                decimals: token.decimals,
                logoURI: token.logoURI,
                listIds: new Set(),
                ...tokenListMetadata,
              },
              incomingListId: tokenList.bridgeTokenListId,
            });
          }
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

          if (!addressOnL1) {
            return;
          }

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
              listIds: new Set(),
              ...tokenListMetadata,
            },
            incomingListId: tokenList.bridgeTokenListId,
          });
        }
      }
    });

    return acc;
  }, {});
}

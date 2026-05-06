import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { ContractStorage, ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useTokenLists } from '../../hooks/useTokenLists';
import { useAppState } from '../../state';
import { LIFI_TRANSFER_LIST_ID } from '../../util/TokenListUtils';
import { TokenListWithId } from '../../util/TokenListUtils';

// keeps the reference stable
const emptyData = {};

function mergeTokenWithPriority({
  existingToken,
  incomingToken,
  incomingListId,
}: {
  existingToken: ERC20BridgeToken | undefined;
  incomingToken: ERC20BridgeToken;
  incomingListId: string;
}) {
  const incomingUsesLifiTokenAddress = incomingListId === LIFI_TRANSFER_LIST_ID;

  if (incomingUsesLifiTokenAddress || !existingToken) {
    return incomingToken;
  }

  return {
    ...incomingToken,
    name: existingToken.name ?? incomingToken.name,
    symbol: existingToken.symbol ?? incomingToken.symbol,
    address: existingToken.address ?? incomingToken.address,
    decimals: existingToken.decimals ?? incomingToken.decimals,
    type: existingToken.type ?? incomingToken.type,
    logoURI: existingToken.logoURI ?? incomingToken.logoURI,
    l2Address: existingToken.l2Address ?? incomingToken.l2Address,
    priceUSD: existingToken.priceUSD ?? incomingToken.priceUSD,
    listIds: existingToken.listIds,
  };
}

export function useTokensFromLists(): ContractStorage<ERC20BridgeToken> {
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const { data: tokenLists = [] } = useTokenLists(childChain.id);

  const { data = emptyData } = useSWRImmutable(
    [tokenLists, parentChain.id, childChain.id, 'useTokensFromLists'],
    ([_tokenLists, _parentChainId, _childChainId]) =>
      tokenListsToSearchableTokenStorage(
        _tokenLists,
        String(_parentChainId),
        String(_childChainId),
      ),
  );

  return data;
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
            acc[addressOnL1] = mergeTokenWithPriority({
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

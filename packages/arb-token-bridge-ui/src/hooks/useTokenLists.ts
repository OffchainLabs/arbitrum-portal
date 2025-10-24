import { SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

import {
  TokenListWithId,
  fetchTokenListFromURL,
  getBridgeTokenListsForNetworks,
} from '../util/TokenListUtils';
import { isNetwork } from '../util/networks';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

function fetchTokenLists(forL2ChainId: number, parentChainId: number): Promise<TokenListWithId[]> {
  return new Promise((resolve) => {
    const { isOrbitChain } = isNetwork(forL2ChainId);
    const requestListArray = getBridgeTokenListsForNetworks({
      childChainId: forL2ChainId,
      parentChainId,
    }).filter((bridgeTokenList) => {
      if (bridgeTokenList.isArbitrumTokenTokenList && isOrbitChain) {
        return false;
      }

      return true;
    });

    Promise.all(
      requestListArray.map((bridgeTokenList) => fetchTokenListFromURL(bridgeTokenList.url)),
    ).then((responses) => {
      const tokenListsWithBridgeTokenListId = responses.reduce<TokenListWithId[]>(
        (acc, { data }, index) => {
          if (!data) {
            return acc;
          }

          const bridgeTokenListId = requestListArray[index]?.id;

          if (typeof bridgeTokenListId === 'undefined') {
            return acc;
          }

          acc.push({
            l2ChainId: String(forL2ChainId),
            bridgeTokenListId,
            ...data,
          });

          return acc;
        },
        [],
      );

      resolve(tokenListsWithBridgeTokenListId);
    });
  });
}

export function useTokenLists(forL2ChainId: number): SWRResponse<TokenListWithId[]> {
  const [networks] = useNetworks();
  const { parentChain } = useNetworksRelationship(networks);
  return useSWRImmutable(
    ['useTokenLists', forL2ChainId, parentChain.id],
    ([, _forL2ChainId, _parentChainId]) => fetchTokenLists(_forL2ChainId, _parentChainId),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
    },
  );
}

import { SWRResponse } from 'swr';
import useSWRImmutable from 'swr/immutable';

import {
  TokenListWithId,
  fetchBridgeTokenList,
  getBridgeTokenListsForNetworks,
} from '../util/TokenListUtils';
import { isNetwork } from '../util/networks';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

function fetchTokenLists(
  forL2ChainId: number,
  parentChainId: number,
  sourceChainId: number,
  destinationChainId: number,
): Promise<TokenListWithId[]> {
  return new Promise((resolve) => {
    const { isOrbitChain } = isNetwork(forL2ChainId);
    const requestListArray = getBridgeTokenListsForNetworks({
      childChainId: forL2ChainId,
      parentChainId,
      sourceChainId,
      destinationChainId,
    }).filter((bridgeTokenList) => {
      if (bridgeTokenList.isArbitrumTokenTokenList && isOrbitChain) {
        return false;
      }

      return true;
    });

    Promise.allSettled(
      requestListArray.map((bridgeTokenList) => fetchBridgeTokenList(bridgeTokenList)),
    ).then((responses) => {
      const tokenListsWithBridgeTokenListId = responses.reduce<TokenListWithId[]>(
        (acc, response, index) => {
          if (response.status !== 'fulfilled') {
            return acc;
          }

          const { data } = response.value;
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
    [
      'useTokenLists',
      forL2ChainId,
      parentChain.id,
      networks.sourceChain.id,
      networks.destinationChain.id,
    ],
    ([, _forL2ChainId, _parentChainId, _sourceChainId, _destinationChainId]) =>
      fetchTokenLists(_forL2ChainId, _parentChainId, _sourceChainId, _destinationChainId),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
    },
  );
}

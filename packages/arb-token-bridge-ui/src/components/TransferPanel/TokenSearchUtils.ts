import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { allowsUnmatchedLifiTokens } from '../../app/api/crosschain-transfers/constants';
import {
  ArbTokenBridgeToken,
  ContractStorage,
  ERC20BridgeToken,
} from '../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useTokenLists } from '../../hooks/useTokenLists';
import { useAppState } from '../../state';
import { TokenListWithId, tokenListTokenToBridgeToken } from '../../util/TokenListUtils';
import { mergeBridgeTokens } from '../../util/mergeBridgeTokens';

// keeps the reference stable
const emptyData: ContractStorage<ERC20BridgeToken> = {};

export type AddTokenFromSearchResult = 'success' | 'disabled' | 'not-found';

export async function addTokenFromSearch({
  address,
  sourceChainId,
  token,
}: {
  address: string;
  sourceChainId: number;
  token: Pick<ArbTokenBridgeToken, 'add' | 'addLifiTokenForChain' | 'addL2NativeToken'>;
}): Promise<AddTokenFromSearchResult> {
  try {
    await token.add(address);
    return 'success';
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenDisabledError') {
      return 'disabled';
    }
  }

  if (allowsUnmatchedLifiTokens(sourceChainId)) {
    try {
      await token.addLifiTokenForChain(address, sourceChainId);
      return 'success';
    } catch {
      // Try the L2-native path next.
    }
  }

  try {
    token.addL2NativeToken(address);
    return 'success';
  } catch {
    return 'not-found';
  }
}

export function useTokensFromLists() {
  const [networks] = useNetworks();
  const { childChain, parentChain } = useNetworksRelationship(networks);
  const { data: tokenLists, isLoading: isLoadingTokenLists } = useTokenLists(childChain.id);

  const { data = emptyData, isLoading } = useSWRImmutable(
    [tokenLists ?? [], parentChain.id, childChain.id, 'useTokensFromLists'],
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
      const bridgeToken = tokenListTokenToBridgeToken({
        token,
        listId: tokenList.bridgeTokenListId,
        parentChainId: Number(l1ChainId),
        childChainId: Number(l2ChainId),
      });

      if (!bridgeToken) {
        return;
      }

      acc[bridgeToken.address] = mergeBridgeTokens({
        existingToken: acc[bridgeToken.address],
        incomingToken: bridgeToken,
        incomingListId: tokenList.bridgeTokenListId,
      });
    });

    return acc;
  }, {});
}

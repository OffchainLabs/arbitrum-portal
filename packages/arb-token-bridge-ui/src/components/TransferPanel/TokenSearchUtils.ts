import { isUnmatchedLifiTokenAllowed } from '../../app/api/crosschain-transfers/constants';
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

// About 1,400 components call these hooks when switching networks. An SWR key with the token
// lists in it is turned into a string on every call, so the converted tokens are kept next to the
// object they come from instead. An entry goes away with that object.
const tokensFromListsCache = new WeakMap<
  TokenListWithId[],
  Map<string, ContractStorage<ERC20BridgeToken>>
>();
const tokensFromUserCache = new WeakMap<
  ContractStorage<ERC20BridgeToken>,
  ContractStorage<ERC20BridgeToken>
>();

export function getTokensFromLists(
  tokenLists: TokenListWithId[],
  parentChainId: number,
  childChainId: number,
): ContractStorage<ERC20BridgeToken> {
  const chains = `${parentChainId}-${childChainId}`;
  let tokensByChains = tokensFromListsCache.get(tokenLists);
  if (!tokensByChains) {
    tokensByChains = new Map();
    tokensFromListsCache.set(tokenLists, tokensByChains);
  }
  let tokens = tokensByChains.get(chains);
  if (!tokens) {
    tokens = tokenListsToSearchableTokenStorage(
      tokenLists,
      String(parentChainId),
      String(childChainId),
    );
    tokensByChains.set(chains, tokens);
  }
  return tokens;
}

export function getTokensFromUser(
  bridgeTokens: ContractStorage<ERC20BridgeToken>,
): ContractStorage<ERC20BridgeToken> {
  let tokens = tokensFromUserCache.get(bridgeTokens);
  if (!tokens) {
    const storage: ContractStorage<ERC20BridgeToken> = {};
    Object.keys(bridgeTokens).forEach((_address: string) => {
      const bridgeToken = bridgeTokens[_address];

      // Any tokens in the bridge that don't have a list id were added by the user.
      if (bridgeToken && bridgeToken.listIds.size === 0) {
        storage[_address] = { ...bridgeToken, listIds: new Set() };
      }
    });
    tokens = storage;
    tokensFromUserCache.set(bridgeTokens, tokens);
  }
  return tokens;
}

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

  if (isUnmatchedLifiTokenAllowed(sourceChainId, address)) {
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
  const { data: tokenLists, isLoading } = useTokenLists(childChain.id);
  const data = tokenLists
    ? getTokensFromLists(tokenLists, parentChain.id, childChain.id)
    : emptyData;

  return { data, isLoading };
}

export function useTokensFromUser(): ContractStorage<ERC20BridgeToken> {
  const {
    app: {
      arbTokenBridge: { bridgeTokens },
    },
  } = useAppState();

  // Can happen when switching networks.
  if (typeof bridgeTokens === 'undefined') {
    return emptyData;
  }

  return getTokensFromUser(bridgeTokens);
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

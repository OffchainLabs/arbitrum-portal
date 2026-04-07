import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { ContractStorage, ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useTokenLists } from '../../hooks/useTokenLists';
import { useAppState } from '../../state';
import { TokenListWithId } from '../../util/TokenListUtils';
import { LIFI_TRANSFER_LIST_ID } from '../../util/TokenListUtils';

// keeps the reference stable
const emptyData = {};

function parsePriceUSD(price: unknown): number | undefined {
  const parsedPrice = Number(price);

  if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
    return undefined;
  }

  return parsedPrice;
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
        const priceUSD = parsePriceUSD(token.extensions?.priceUSD);
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
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            logoURI: token.logoURI,
          };
          const updatedL1Token = acc[address];
          if (updatedL1Token && !updatedL1Token.priceUSD && priceUSD) {
            updatedL1Token.priceUSD = priceUSD;
          }
        }

        // acc[address] was defined in the if/else above
        const l1Token = acc[address];
        if (l1Token) {
          l1Token.listIds.add(tokenList.bridgeTokenListId);
        }
      } else if (stringifiedChainId === l2ChainId) {
        // The token is an L2 token

        if (!token.extensions?.bridgeInfo) {
          return;
        }

        // @ts-ignore TODO
        // TODO: should we upgrade '@uniswap/token-lists'?
        const bridgeInfo: {
          [chainId: string]: {
            tokenAddress: string;
            name?: string;
            symbol?: string;
            decimals?: number;
            logoURI?: string;
          };
        } = token.extensions.bridgeInfo;

        const l1Bridge = bridgeInfo[l1ChainId];
        if (l1Bridge) {
          const addressOnL1 = l1Bridge.tokenAddress.toLowerCase();
          const priceUSD = parsePriceUSD(token.extensions?.priceUSD);
          const shouldPreferParentMetadata = tokenList.bridgeTokenListId === LIFI_TRANSFER_LIST_ID;
          const parentTokenName = l1Bridge.name ?? token.name;
          const parentTokenSymbol = l1Bridge.symbol ?? token.symbol;
          const parentTokenDecimals = l1Bridge.decimals ?? token.decimals;
          const parentTokenLogoURI = l1Bridge.logoURI ?? token.logoURI;

          if (!addressOnL1) {
            return;
          }

          if (typeof acc[addressOnL1] === 'undefined') {
            // Token is not on the list yet
            acc[addressOnL1] = {
              name: shouldPreferParentMetadata ? parentTokenName : token.name,
              symbol: shouldPreferParentMetadata ? parentTokenSymbol : token.symbol,
              type: TokenType.ERC20,
              logoURI: shouldPreferParentMetadata ? parentTokenLogoURI : token.logoURI,
              address: addressOnL1,
              l2Address: address,
              decimals: shouldPreferParentMetadata ? parentTokenDecimals : token.decimals,
              listIds: new Set(),
              priceUSD,
            };
          } else {
            const l1Token = acc[addressOnL1];
            if (!l1Token) {
              return;
            }

            if (shouldPreferParentMetadata) {
              // LiFi bridgeInfo carries the canonical parent-chain branding, so prefer it.
              l1Token.name = parentTokenName;
              l1Token.symbol = parentTokenSymbol;
              l1Token.decimals = parentTokenDecimals;
              l1Token.logoURI = parentTokenLogoURI;
            }
            l1Token.l2Address = address;
            if (!l1Token.priceUSD && priceUSD) {
              l1Token.priceUSD = priceUSD;
            }
          }

          // acc[address] was defined in the if/else above
          const l1Token = acc[addressOnL1];
          if (l1Token) {
            l1Token.listIds.add(tokenList.bridgeTokenListId);
          }
        }
      }
    });

    return acc;
  }, {});
}

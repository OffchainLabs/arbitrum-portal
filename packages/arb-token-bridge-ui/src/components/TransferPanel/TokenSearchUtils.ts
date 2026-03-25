import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { ContractStorage, ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import { useNetworks } from '../../hooks/useNetworks';
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship';
import { useTokenLists } from '../../hooks/useTokenLists';
import { useAppState } from '../../state';
import { TokenListWithId } from '../../util/TokenListUtils';

// keeps the reference stable
const emptyData = {};

function parsePriceUSD(price: unknown): number | undefined {
  const parsedPrice = Number(price);

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
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
              name: parentTokenName,
              symbol: parentTokenSymbol,
              type: TokenType.ERC20,
              logoURI: parentTokenLogoURI,
              address: addressOnL1,
              l2Address: address,
              decimals: parentTokenDecimals,
              listIds: new Set(),
              priceUSD,
            };
          } else {
            // The token's L1 address is already on the list.
            // LiFi bridgeInfo carries the canonical parent-chain branding, so prefer it.
            acc[addressOnL1]!.name = parentTokenName;
            acc[addressOnL1]!.symbol = parentTokenSymbol;
            acc[addressOnL1]!.decimals = parentTokenDecimals;
            acc[addressOnL1]!.logoURI = parentTokenLogoURI;
            acc[addressOnL1]!.l2Address = address;
            if (!acc[addressOnL1]!.priceUSD && priceUSD) {
              acc[addressOnL1]!.priceUSD = priceUSD;
            }
          }

          // acc[address] was defined in the if/else above
          acc[addressOnL1]!.listIds.add(tokenList.bridgeTokenListId);
        }
      }
    });

    return acc;
  }, {});
}

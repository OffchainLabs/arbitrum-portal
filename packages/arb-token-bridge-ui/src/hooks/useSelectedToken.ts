import { Provider } from '@ethersproject/providers';
import { constants, utils } from 'ethers';
import { useCallback, useMemo, useRef } from 'react';
import useSWRImmutable from 'swr/immutable';

import { getChainIdFromProvider, getProviderForChainId } from '@/token-bridge-sdk/utils';

import {
  useTokensFromLists,
  useTokensFromUser,
} from '../components/TransferPanel/TokenSearchUtils';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';
import {
  getEthereumPyusdToken,
  getPyusdTokenForArbitrumOneWithdrawal,
  isTokenEthereumPyusd,
} from '../util/PyusdUtils';
import {
  getL2ERC20Address,
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenMainnetUSDC,
  isTokenNativeUSDC,
  isTokenSepoliaUSDC,
} from '../util/TokenUtils';
import { logger } from '../util/logger';
import { isNetwork } from '../util/networks';
import { sanitizeNullSelectedToken } from '../util/queryParamUtils';
import { ERC20BridgeToken, TokenType } from './arbTokenBridge.types';
import { useArbQueryParams } from './useArbQueryParams';
import { useNetworks } from './useNetworks';
import { useNetworksRelationship } from './useNetworksRelationship';

export { sanitizeNullSelectedToken } from '../util/queryParamUtils';

const commonUSDC: ERC20BridgeToken = {
  name: 'USD Coin',
  type: TokenType.ERC20,
  symbol: 'USDC',
  decimals: 6,
  listIds: new Set<string>(),
  address: '',
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
};

export const useSelectedToken = (): [
  ERC20BridgeToken | null,
  (erc20ParentAddress: string | null) => void,
] => {
  const [{ token: tokenFromSearchParams }, setQueryParams] = useArbQueryParams();
  const [networks] = useNetworks();
  const { childChain, parentChain, isDepositMode } = useNetworksRelationship(networks);
  const tokensFromLists = useTokensFromLists();
  const tokensFromUser = useTokensFromUser();

  const { data: usdcToken } = useSWRImmutable(
    [
      tokenFromSearchParams,
      parentChain.id,
      childChain.id,
      networks.destinationChain.id,
      'useSelectedToken_usdc',
    ],
    async ([_tokenAddress, _parentChainId, _childChainId, _destinationChainId]) => {
      if (!_tokenAddress) {
        return null;
      }

      if (!isTokenNativeUSDC(_tokenAddress)) {
        return null;
      }

      // USDC for lifi chains, use bridgeTokens
      if (
        _destinationChainId === ChainId.ApeChain ||
        _destinationChainId === ChainId.Superposition
      ) {
        return null;
      }

      const parentProvider = getProviderForChainId(_parentChainId);
      const childProvider = getProviderForChainId(_childChainId);

      return getUsdcToken({
        tokenAddress: _tokenAddress,
        parentProvider,
        childProvider,
      });
    },
  );

  const setSelectedToken = useCallback(
    (erc20ParentAddress: string | null) => {
      return setQueryParams((latestQuery) => {
        try {
          const sanitizedTokenAddress = sanitizeNullSelectedToken({
            sourceChainId: latestQuery.sourceChain,
            destinationChainId: latestQuery.destinationChain,
            erc20ParentAddress,
          });

          if (sanitizedTokenAddress) {
            return {
              token: sanitizedTokenAddress,
              destinationToken: sanitizedTokenAddress,
            };
          }

          /**
           * ApeChain to Superposition, return zero address for Superposition if we're transfering APE token
           */
          if (
            latestQuery.sourceChain === ChainId.ApeChain &&
            latestQuery.destinationChain === ChainId.Superposition
          ) {
            return {
              token: sanitizeTokenAddress(erc20ParentAddress),
              destinationToken: constants.AddressZero,
            };
          }

          return {
            token: sanitizeTokenAddress(erc20ParentAddress),
            destinationToken: sanitizeTokenAddress(erc20ParentAddress),
          };
        } catch (error) {
          logger.error('Error sanitizing token address:', error);
          return { token: undefined, destinationToken: undefined };
        }
      });
    },
    [setQueryParams],
  );

  const normalizedTokenAddress = tokenFromSearchParams?.toLowerCase();
  const ethereumPyusdAddress = CommonAddress.Ethereum.PYUSD.toLowerCase();
  const listSelectedToken = normalizedTokenAddress
    ? tokensFromLists[normalizedTokenAddress]
    : undefined;
  const userSelectedToken = normalizedTokenAddress
    ? tokensFromUser[normalizedTokenAddress]
    : undefined;
  const pyusdListEntry = listSelectedToken || tokensFromLists[ethereumPyusdAddress];
  const stablePyusdListIdsRef = useRef<Set<string> | undefined>(undefined);

  if (!areSetsEqual(stablePyusdListIdsRef.current, pyusdListEntry?.listIds)) {
    stablePyusdListIdsRef.current = pyusdListEntry?.listIds
      ? new Set(pyusdListEntry.listIds)
      : undefined;
  }

  const stablePyusdListIds = stablePyusdListIdsRef.current;
  const selectedPyusdToken = useMemo(() => {
    return getSelectedPyusdToken({
      tokenAddress: tokenFromSearchParams,
      isDepositMode,
      sourceChainId: networks.sourceChain.id,
      destinationChainId: networks.destinationChain.id,
      pyusdPriceUSD: pyusdListEntry?.priceUSD,
      pyusdL2Address: pyusdListEntry?.l2Address,
      pyusdListIds: stablePyusdListIds,
    });
  }, [
    isDepositMode,
    networks.destinationChain.id,
    networks.sourceChain.id,
    pyusdListEntry?.l2Address,
    pyusdListEntry?.priceUSD,
    stablePyusdListIds,
    tokenFromSearchParams,
  ]);

  const selectedToken = useMemo(
    () => selectedPyusdToken ?? usdcToken ?? userSelectedToken ?? listSelectedToken ?? null,
    [listSelectedToken, selectedPyusdToken, usdcToken, userSelectedToken],
  );

  if (!tokenFromSearchParams) {
    return [null, setSelectedToken] as const;
  }

  return [selectedToken, setSelectedToken] as const;
};

function sanitizeTokenAddress(tokenAddress: string | null): string | undefined {
  if (!tokenAddress) {
    return undefined;
  }
  if (utils.isAddress(tokenAddress)) {
    return tokenAddress;
  }
  return undefined;
}

function areSetsEqual<T>(a: Set<T> | undefined, b: Set<T> | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}

function getSelectedPyusdToken({
  tokenAddress,
  isDepositMode,
  sourceChainId,
  destinationChainId,
  pyusdPriceUSD,
  pyusdL2Address,
  pyusdListIds,
}: {
  tokenAddress: string | undefined;
  isDepositMode: boolean;
  sourceChainId: number;
  destinationChainId: number;
  pyusdPriceUSD?: number;
  pyusdL2Address?: string;
  pyusdListIds?: Set<string>;
}) {
  if (!tokenAddress) {
    return null;
  }

  if (
    isDepositMode &&
    isTokenEthereumPyusd(tokenAddress) &&
    sourceChainId === ChainId.Ethereum &&
    destinationChainId === ChainId.ArbitrumOne
  ) {
    return {
      ...getEthereumPyusdToken({
        priceUSD: pyusdPriceUSD,
        listIds: pyusdListIds,
      }),
      l2Address: pyusdL2Address ?? CommonAddress.ArbitrumOne.PYUSDOFT,
    };
  }

  return getPyusdTokenForArbitrumOneWithdrawal({
    tokenAddress,
    sourceChainId,
    destinationChainId,
    priceUSD: pyusdPriceUSD,
    listIds: pyusdListIds,
  });
}

export async function getUsdcToken({
  tokenAddress,
  parentProvider,
  childProvider,
}: {
  tokenAddress: string;
  parentProvider: Provider;
  childProvider: Provider;
}): Promise<ERC20BridgeToken | null> {
  const parentChainId = await getChainIdFromProvider(parentProvider);
  const childChainId = await getChainIdFromProvider(childProvider);

  const {
    isEthereumMainnet: isParentChainEthereumMainnet,
    isSepolia: isParentChainSepolia,
    isArbitrumOne: isParentChainArbitrumOne,
    isArbitrumSepolia: isParentChainArbitrumSepolia,
  } = isNetwork(parentChainId);

  const { isArbitrumOne: isChildArbitrumOne, isArbitrumSepolia: isChildArbitrumSepolia } =
    isNetwork(childChainId);

  // Ethereum Mainnet USDC
  if (isTokenMainnetUSDC(tokenAddress) && isParentChainEthereumMainnet && isChildArbitrumOne) {
    return {
      ...commonUSDC,
      address: CommonAddress.Ethereum.USDC,
      l2Address: CommonAddress.ArbitrumOne['USDC.e'],
    };
  }

  // Ethereum Sepolia USDC
  if (isTokenSepoliaUSDC(tokenAddress) && isParentChainSepolia && isChildArbitrumSepolia) {
    return {
      ...commonUSDC,
      address: CommonAddress.Sepolia.USDC,
      l2Address: CommonAddress.ArbitrumSepolia['USDC.e'],
    };
  }

  // Arbitrum One USDC when Ethereum is the parent chain
  if (isTokenArbitrumOneNativeUSDC(tokenAddress) && isParentChainEthereumMainnet) {
    return {
      ...commonUSDC,
      address: CommonAddress.ArbitrumOne.USDC,
      l2Address: CommonAddress.ArbitrumOne.USDC,
    };
  }

  // Arbitrum Sepolia USDC when Ethereum is the parent chain
  if (isTokenArbitrumSepoliaNativeUSDC(tokenAddress) && isParentChainSepolia) {
    return {
      ...commonUSDC,
      address: CommonAddress.ArbitrumSepolia.USDC,
      l2Address: CommonAddress.ArbitrumSepolia.USDC,
    };
  }

  // Arbitrum USDC with Orbit chains
  if (
    (isTokenArbitrumOneNativeUSDC(tokenAddress) && isParentChainArbitrumOne) ||
    (isTokenArbitrumSepoliaNativeUSDC(tokenAddress) && isParentChainArbitrumSepolia) ||
    (isTokenMainnetUSDC(tokenAddress) && isParentChainEthereumMainnet) ||
    (isTokenSepoliaUSDC(tokenAddress) && isParentChainSepolia)
  ) {
    let childChainUsdcAddress;
    try {
      childChainUsdcAddress = (
        await getL2ERC20Address({
          erc20L1Address: tokenAddress,
          l1Provider: parentProvider,
          l2Provider: childProvider,
        })
      ).toLowerCase();
    } catch {
      // could be never bridged before
    }

    return {
      ...commonUSDC,
      address: tokenAddress,
      l2Address: childChainUsdcAddress,
    };
  }

  return null;
}

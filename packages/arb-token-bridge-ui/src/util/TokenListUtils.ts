import { TokenList } from '@uniswap/token-lists';
import axios from 'axios';
import { ImageProps } from 'next/image';

import { lifiDestinationChainIds } from '../app/api/crosschain-transfers/constants';
import { ArbTokenBridge } from '../hooks/arbTokenBridge.types';
import { ChainId } from '../types/ChainId';
import orbitChainsData from './orbitChainsData.json';

const ArbitrumLogo = '/images/lists/ArbitrumLogo.png';
const CMCLogo = '/images/lists/cmc.png';
const CoinGeckoLogo = '/images/lists/coinGecko.svg';
const UniswapLogo = '/images/lists/uniswap.png';

export const SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID = 'SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID';
export const LIFI_TRANSFER_LIST_ID = 'lifi-token-list';

export interface BridgeTokenList {
  // string is required here to avoid duplicates when mapping orbit chains to tokenlists
  id: string;
  originChainID: number;
  url: string;
  name: string;
  isDefault: boolean;
  isArbitrumTokenTokenList?: boolean;
  logoURI: ImageProps['src'];
  parentChainID?: number; // For LiFi token lists, stores the parent chain ID
}

export const BRIDGE_TOKEN_LISTS: BridgeTokenList[] = [
  {
    id: SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID,
    originChainID: 0, // This token list spans all Arbitrum chains and their L1 counterparts
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbitrum_token_token_list.json',
    name: 'Arbitrum Token',
    isDefault: true,
    logoURI: ArbitrumLogo,
    isArbitrumTokenTokenList: true,
  },
  {
    id: '1',
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
    name: 'Arbitrum Whitelist Era',
    isDefault: true,
    logoURI: ArbitrumLogo,
  },
  {
    id: '2',
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo,
  },
  {
    id: '4',
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coingecko.json',
    name: 'Arbed CoinGecko List',
    isDefault: true,
    logoURI: CoinGeckoLogo,
  },
  {
    id: '5',
    originChainID: ChainId.ArbitrumOne,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: false,
    logoURI: CMCLogo,
  },
  {
    id: '6',
    originChainID: ChainId.ArbitrumNova,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo,
  },
  // Dummy data required, otherwise useArbTokenBridge will return undefined bridgeTokens
  // This will cause TokenImportDialog to hang and fail E2E
  // TODO: remove list for chain ID 412346 after fix:
  // https://github.com/OffchainLabs/arb-token-bridge/issues/564
  {
    id: '9',
    // Local node
    originChainID: ChainId.ArbitrumLocal,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: true,
    logoURI: CMCLogo,
  },
  {
    id: '10',
    originChainID: ChainId.ArbitrumSepolia,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_uniswap_labs.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo,
  },
  // CoinGecko
  {
    id: '11',
    originChainID: ChainId.ArbitrumNova,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_coingecko.json',
    name: 'Arbed CoinGecko List',
    isDefault: true,
    logoURI: CoinGeckoLogo,
  },
  {
    id: '13',
    originChainID: ChainId.ArbitrumSepolia,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421614_arbed_coingecko.json',
    name: 'Arbed CoinGecko List',
    isDefault: true,
    logoURI: CoinGeckoLogo,
  },
  {
    id: '660279',
    // Xai
    originChainID: 660279,
    url: 'tokenLists/660279_default.json',
    name: 'XAI Default List',
    isDefault: true,
    logoURI: '/images/XaiLogo.svg',
  },
  // For all orbit chains,
  ...orbitChainsData.mainnet.concat(orbitChainsData.testnet).reduce((acc, chain) => {
    // Only include arbified native token list for L3 settling to ArbOne
    if (chain.parentChainId === ChainId.ArbitrumOne) {
      acc.push({
        id: `${chain.chainId}_native`,
        originChainID: chain.chainId,
        url: `https://tokenlist.arbitrum.io/ArbTokenLists/${chain.chainId}_arbed_native_list.json`,
        name: `${chain.name} Default List`,
        isDefault: true,
        logoURI: ArbitrumLogo,
      });
    }

    acc.push({
      id: `${chain.chainId}_uniswap`,
      originChainID: chain.chainId,
      url: `https://tokenlist.arbitrum.io/ArbTokenLists/${chain.chainId}_arbed_uniswap_labs.json`,
      name: `${chain.name} Arbed Uniswap List`,
      isDefault: true,
      logoURI: UniswapLogo,
    });

    return acc;
  }, [] as BridgeTokenList[]),
  // LiFi token lists for cross-chain transfers
  ...Object.entries(lifiDestinationChainIds).flatMap(([parentChainId, childChainIds]) =>
    childChainIds.map((childChainId) => ({
      id: LIFI_TRANSFER_LIST_ID,
      originChainID: Number(childChainId),
      parentChainID: Number(parentChainId),
      url: `/api/crosschain-transfers/lifi/tokens?parentChainId=${parentChainId}&childChainId=${childChainId}`,
      name: `LiFi Tokens`,
      isDefault: true,
      logoURI: ArbitrumLogo,
    })),
  ),
];

export const listIdsToNames: { [key: string]: string } = {};

BRIDGE_TOKEN_LISTS.forEach((bridgeTokenList) => {
  listIdsToNames[bridgeTokenList.id] = bridgeTokenList.name;
});

export const getBridgeTokenListsForNetworks = ({
  childChainId,
  parentChainId,
}: {
  childChainId: number;
  parentChainId: number;
}): BridgeTokenList[] => {
  return BRIDGE_TOKEN_LISTS.filter((bridgeTokenList) => {
    if (bridgeTokenList.isArbitrumTokenTokenList) {
      return true;
    }

    if (bridgeTokenList.parentChainID !== undefined) {
      return (
        bridgeTokenList.parentChainID === parentChainId &&
        bridgeTokenList.originChainID === childChainId
      );
    }

    return bridgeTokenList.originChainID === childChainId;
  });
};

export const getLifiTokenListForNetworks = ({
  childChainId,
  parentChainId,
}: {
  childChainId: number;
  parentChainId: number;
}): BridgeTokenList | undefined => {
  return getBridgeTokenListsForNetworks({ childChainId, parentChainId }).find(
    (tokenList) => tokenList.id === LIFI_TRANSFER_LIST_ID,
  );
};

export const getDefaultBridgeTokenLists = ({
  childChainId,
  parentChainId,
}: {
  childChainId: number;
  parentChainId: number;
}): BridgeTokenList[] => {
  return getBridgeTokenListsForNetworks({ childChainId, parentChainId }).filter(
    (bridgeTokenList) => bridgeTokenList.isDefault,
  );
};

export interface TokenListWithId extends TokenList {
  l2ChainId: string;
  bridgeTokenListId: string;
}

export const addBridgeTokenListToBridge = (
  bridgeTokenList: BridgeTokenList,
  arbTokenBridge: ArbTokenBridge,
) => {
  fetchTokenListFromURL(bridgeTokenList.url).then(({ data: tokenList }) => {
    if (!tokenList) {
      return;
    }

    arbTokenBridge.token.addTokensFromList(tokenList, bridgeTokenList.id);
  });
};

export async function fetchTokenListFromURL(tokenListURL: string): Promise<{
  data: TokenList | undefined;
}> {
  try {
    const { data } = await axios.get(tokenListURL, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

    return { data };
  } catch (error) {
    console.warn('Token List URL Invalid', tokenListURL);
    return { data: undefined };
  }
}

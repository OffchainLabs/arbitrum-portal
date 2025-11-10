import { constants } from 'ethers';

import { LIFI_TRANSFER_LIST_ID } from '@/bridge/util/TokenListUtils';

import { ETHER_TOKEN_LOGO, ether } from '../../../constants';
import { ContractStorage, ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { ChainId } from '../../../types/ChainId';
import { addressesEqual } from '../../../util/AddressUtils';
import { CommonAddress, bridgedUsdcToken, commonUsdcToken } from '../../../util/CommonAddressUtils';
import { allowedLifiSourceChainIds, lifiDestinationChainIds } from './constants';

export function isLifiTransfer({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}) {
  return !!(
    allowedLifiSourceChainIds.includes(sourceChainId) &&
    lifiDestinationChainIds[sourceChainId]?.includes(destinationChainId)
  );
}

function isUsdcToken(tokenAddress: string | undefined) {
  return (
    addressesEqual(tokenAddress, CommonAddress.Ethereum.USDC) ||
    addressesEqual(tokenAddress, CommonAddress.ArbitrumOne.USDC) ||
    addressesEqual(tokenAddress, CommonAddress.ArbitrumOne['USDC.e']) ||
    addressesEqual(tokenAddress, CommonAddress.Superposition.USDCe) ||
    addressesEqual(tokenAddress, CommonAddress.ApeChain.USDCe) ||
    addressesEqual(tokenAddress, CommonAddress.Base.USDC)
  );
}

export function isValidLifiTransfer({
  fromToken,
  sourceChainId,
  destinationChainId,
  tokensFromLists,
}: {
  fromToken: string | undefined;
  sourceChainId: number;
  destinationChainId: number;
  tokensFromLists?: ContractStorage<ERC20BridgeToken>;
}): boolean {
  // Check if it's a valid lifi pair
  if (
    !isLifiTransfer({
      sourceChainId,
      destinationChainId,
    })
  ) {
    return false;
  }

  // Native ETH is always valid for LiFi
  if (!fromToken) {
    return true;
  }

  if (!tokensFromLists) {
    return true;
  }

  const token = tokensFromLists[fromToken.toLowerCase()];
  return token?.listIds.has(LIFI_TRANSFER_LIST_ID) ?? false;
}

const etherWithLogo: ERC20BridgeToken = {
  ...ether,
  logoURI: ETHER_TOKEN_LOGO,
  type: TokenType.ERC20,
  address: constants.AddressZero,
  listIds: new Set<string>(),
};

/**
 * Temporary solution until token lists support overrides.
 */
const Weth = {
  symbol: 'WETH',
  name: 'Wrapped Ether',
  decimals: 18,
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
};

function getUsdc(chainId: number) {
  return (
    {
      [ChainId.Ethereum]: {
        address: CommonAddress.Ethereum.USDC,
        symbol: 'USDC',
        name: 'USDC',
      },
      [ChainId.ArbitrumOne]: {
        address: CommonAddress.ArbitrumOne.USDC,
        symbol: 'USDC',
        name: 'USDC',
      },
      [ChainId.Superposition]: {
        address: CommonAddress.Superposition.USDCe,
        symbol: 'USDC.e',
        name: 'Bridged USDC',
      },
      [ChainId.ApeChain]: {
        address: CommonAddress.ApeChain.USDCe,
        symbol: 'USDC.e',
        name: 'Bridged USDC',
      },
      [ChainId.Base]: {
        address: CommonAddress.Base.USDC,
        symbol: 'USDC',
        name: 'USD Coin',
      },
    }[chainId] || null
  );
}

const apeToken = {
  symbol: 'APE',
  name: 'ApeCoin',
  decimals: 18,
  logoURI: '/images/ApeTokenLogo.svg',
  type: TokenType.ERC20,
  listIds: new Set<string>(),
} as const;

function getApe(chainId: number) {
  return (
    {
      [ChainId.Ethereum]: {
        ...apeToken,
        address: CommonAddress.Ethereum.APE,
      },
      [ChainId.ArbitrumOne]: {
        ...apeToken,
        address: CommonAddress.ArbitrumOne.APE,
      },
      [ChainId.Superposition]: {
        ...ether,
        address: constants.AddressZero,
        type: TokenType.ERC20,
        listIds: new Set<string>(),
      } as ERC20BridgeToken,
      [ChainId.ApeChain]: null,
      [ChainId.Base]: {
        ...apeToken,
        address: CommonAddress.Base.APE,
      },
    }[chainId] || null
  );
}

/** Returns source and destination token for current token on (source,destination) */
export function getTokenOverride({
  fromToken,
  sourceChainId,
  destinationChainId,
}: {
  fromToken: string | undefined;
  sourceChainId: number;
  destinationChainId: number;
}): {
  source: ERC20BridgeToken | null;
  destination: ERC20BridgeToken | null;
} {
  // Eth on ApeChain
  if (addressesEqual(fromToken, constants.AddressZero)) {
    if (sourceChainId === ChainId.ApeChain) {
      return {
        source: {
          ...Weth,
          address: CommonAddress.ApeChain.WETH,
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
        destination: {
          ...etherWithLogo,
          address: constants.AddressZero,
        },
      };
    }

    if (destinationChainId === ChainId.ApeChain) {
      return {
        source: {
          ...etherWithLogo,
          address: constants.AddressZero,
        },
        destination: {
          ...Weth,
          address: CommonAddress.ApeChain.WETH,
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
      };
    }
  }

  // Ape on ApeChain
  if (
    !fromToken &&
    (sourceChainId === ChainId.ApeChain || destinationChainId === ChainId.ApeChain)
  ) {
    if (sourceChainId === ChainId.ApeChain) {
      return {
        source: null,
        destination: getApe(destinationChainId) ? getApe(destinationChainId) : null,
      };
    }

    return {
      source: getApe(sourceChainId) ? getApe(sourceChainId) : null,
      destination: null,
    };
  }

  // Native token on non-ETH chain
  if (!fromToken) {
    return {
      source: null,
      destination: null,
    };
  }

  // USDC
  if (fromToken && isUsdcToken(fromToken)) {
    const destinationUsdcToken = getUsdc(destinationChainId);
    const sourceUsdcToken = getUsdc(sourceChainId);

    if (
      addressesEqual(fromToken, CommonAddress.Ethereum.USDC) &&
      sourceChainId === ChainId.ArbitrumOne &&
      destinationChainId === ChainId.Ethereum
    ) {
      return {
        source: {
          ...sourceUsdcToken,
          ...bridgedUsdcToken,
          name: 'Bridged USDC',
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
        destination: {
          ...commonUsdcToken,
          ...destinationUsdcToken,
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
      };
    }

    if (destinationUsdcToken && sourceUsdcToken) {
      return {
        source: {
          ...commonUsdcToken,
          ...sourceUsdcToken,
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
        destination: {
          ...commonUsdcToken,
          ...destinationUsdcToken,
          type: TokenType.ERC20,
          listIds: new Set<string>(),
        },
      };
    }
  }

  return {
    source: null,
    destination: null,
  };
}

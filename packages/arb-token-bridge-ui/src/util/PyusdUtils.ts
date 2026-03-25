import { ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';
import { ChainId } from '../types/ChainId';
import { addressesEqual } from './AddressUtils';
import { CommonAddress } from './CommonAddressUtils';

type PyusdTokenMetadata = {
  priceUSD?: number;
  listIds?: Set<string>;
};

export const ETHEREUM_PYUSD_LOGO_URI =
  'https://assets.coingecko.com/coins/images/31212/thumb/PYUSD_Token_Logo_2x.png?1765987788';
export const ARBITRUM_ONE_PYUSD_OFT_LOGO_URI =
  'https://storage.googleapis.com/zapper-fi-assets/tokens/arbitrum/0x46850ad61c2b7d64d08c9c754f45254596696984.png';
const commonPyusdToken = {
  decimals: 6,
  symbol: 'PYUSD',
  type: TokenType.ERC20,
  importLookupAddress: CommonAddress.Ethereum.PYUSD,
} satisfies Pick<ERC20BridgeToken, 'decimals' | 'symbol' | 'type' | 'importLookupAddress'>;

export function isTokenEthereumPyusd(address: string | undefined) {
  return addressesEqual(address, CommonAddress.Ethereum.PYUSD);
}

export function isTokenArbitrumOnePyusdCanonical(address: string | undefined) {
  return addressesEqual(address, CommonAddress.ArbitrumOne.PYUSDCanonical);
}

export function isTokenArbitrumOnePyusdOft(address: string | undefined) {
  return addressesEqual(address, CommonAddress.ArbitrumOne.PYUSDOFT);
}

export function getEthereumPyusdToken({
  priceUSD,
  listIds,
}: PyusdTokenMetadata = {}): ERC20BridgeToken {
  return {
    ...commonPyusdToken,
    listIds: new Set(listIds ?? []),
    name: 'PYUSD',
    address: CommonAddress.Ethereum.PYUSD,
    logoURI: ETHEREUM_PYUSD_LOGO_URI,
    priceUSD,
    sourceBalanceAddress: CommonAddress.Ethereum.PYUSD,
    destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
  };
}

export function getArbitrumOnePyusdCanonicalToken({
  priceUSD,
  listIds,
}: PyusdTokenMetadata = {}): ERC20BridgeToken {
  return {
    ...commonPyusdToken,
    listIds: new Set(listIds ?? []),
    name: 'PYUSD Canonical',
    address: CommonAddress.Ethereum.PYUSD,
    l2Address: CommonAddress.ArbitrumOne.PYUSDCanonical,
    logoURI: ETHEREUM_PYUSD_LOGO_URI,
    priceUSD,
    sourceBalanceAddress: CommonAddress.ArbitrumOne.PYUSDCanonical,
    destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
  };
}

export function getArbitrumOnePyusdOftToken({
  priceUSD,
  listIds,
}: PyusdTokenMetadata = {}): ERC20BridgeToken {
  return {
    ...commonPyusdToken,
    listIds: new Set(listIds ?? []),
    name: 'PYUSD OFT',
    address: CommonAddress.ArbitrumOne.PYUSDOFT,
    l2Address: CommonAddress.ArbitrumOne.PYUSDOFT,
    logoURI: ARBITRUM_ONE_PYUSD_OFT_LOGO_URI,
    priceUSD,
    sourceBalanceAddress: CommonAddress.ArbitrumOne.PYUSDOFT,
    destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
  };
}

export function getPyusdTokenForArbitrumOneWithdrawal({
  tokenAddress,
  sourceChainId,
  destinationChainId,
  priceUSD,
  listIds,
}: PyusdTokenMetadata & {
  tokenAddress: string;
  sourceChainId: number;
  destinationChainId: number;
}): ERC20BridgeToken | null {
  if (sourceChainId !== ChainId.ArbitrumOne || destinationChainId !== ChainId.Ethereum) {
    return null;
  }

  if (isTokenEthereumPyusd(tokenAddress)) {
    return getArbitrumOnePyusdCanonicalToken({
      priceUSD,
      listIds,
    });
  }

  if (isTokenArbitrumOnePyusdOft(tokenAddress)) {
    return getArbitrumOnePyusdOftToken({
      priceUSD,
      listIds,
    });
  }

  return null;
}

export function getPyusdTokenForTransfer({
  tokenAddress,
  sourceChainId,
  destinationChainId,
  isDepositMode,
  pyusdL2Address,
  priceUSD,
  listIds,
}: PyusdTokenMetadata & {
  tokenAddress: string | undefined;
  sourceChainId: number;
  destinationChainId: number;
  isDepositMode: boolean;
  pyusdL2Address?: string;
}): ERC20BridgeToken | null {
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
        priceUSD,
        listIds,
      }),
      l2Address: pyusdL2Address ?? CommonAddress.ArbitrumOne.PYUSDOFT,
    };
  }

  return getPyusdTokenForArbitrumOneWithdrawal({
    tokenAddress,
    sourceChainId,
    destinationChainId,
    priceUSD,
    listIds,
  });
}

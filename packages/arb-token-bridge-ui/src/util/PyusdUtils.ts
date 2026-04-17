import { ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';
import { addressesEqual } from './AddressUtils';
import { CommonAddress } from './CommonAddressUtils';

type PyusdTokenMetadata = {
  priceUSD?: number;
  listIds?: Set<string>;
};

export const PYUSD_BLACK_LOGO_URI =
  'https://assets.coingecko.com/coins/images/31212/thumb/PYUSD_Token_Logo_2x.png?1765987788';
export const PYUSD_BLUE_LOGO_URI =
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

export function isTokenArbitrumOnePyusd(address: string | undefined) {
  return addressesEqual(address, CommonAddress.ArbitrumOne.PYUSD);
}

export function getEthereumPyusdToken({
  priceUSD,
  listIds,
}: PyusdTokenMetadata = {}): ERC20BridgeToken {
  return {
    ...commonPyusdToken,
    listIds: new Set(listIds ?? []),
    name: 'PayPal USD',
    address: CommonAddress.Ethereum.PYUSD,
    logoURI: PYUSD_BLACK_LOGO_URI,
    priceUSD,
  };
}

export function getArbitrumOnePyusdCanonicalToken({
  priceUSD,
  listIds,
}: PyusdTokenMetadata = {}): ERC20BridgeToken {
  return {
    ...commonPyusdToken,
    listIds: new Set(listIds ?? []),
    name: 'PayPal USD Canonical',
    address: CommonAddress.ArbitrumOne.PYUSDCanonical,
    l2Address: CommonAddress.ArbitrumOne.PYUSDCanonical,
    logoURI: PYUSD_BLUE_LOGO_URI,
    priceUSD,
    destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
  };
}

export function getArbitrumOnePyusdToken({
  priceUSD,
  listIds,
}: PyusdTokenMetadata = {}): ERC20BridgeToken {
  return {
    ...commonPyusdToken,
    listIds: new Set(listIds ?? []),
    name: 'PayPal USD',
    address: CommonAddress.ArbitrumOne.PYUSD,
    l2Address: CommonAddress.ArbitrumOne.PYUSD,
    logoURI: PYUSD_BLACK_LOGO_URI,
    priceUSD,
    destinationBalanceAddress: CommonAddress.Ethereum.PYUSD,
  };
}

export function getPyusdTokenOverride({
  tokenAddress,
  isDepositMode,
}: {
  tokenAddress: string | undefined;
  isDepositMode: boolean;
}) {
  if (isDepositMode && isTokenEthereumPyusd(tokenAddress)) {
    return {
      source: getEthereumPyusdToken(),
      destination: getArbitrumOnePyusdToken(),
    };
  }

  if (
    !isDepositMode &&
    (isTokenArbitrumOnePyusd(tokenAddress) || isTokenEthereumPyusd(tokenAddress))
  ) {
    return {
      source: getArbitrumOnePyusdToken(),
      destination: getEthereumPyusdToken(),
    };
  }

  if (!isDepositMode && isTokenArbitrumOnePyusdCanonical(tokenAddress)) {
    return {
      source: getArbitrumOnePyusdCanonicalToken(),
      destination: getEthereumPyusdToken(),
    };
  }

  return null;
}

export function isPyusdOverrideFlow({
  tokenAddress,
  isDepositMode,
}: {
  tokenAddress: string | undefined;
  isDepositMode: boolean;
}) {
  if (isDepositMode) {
    return isTokenEthereumPyusd(tokenAddress);
  }

  return isTokenArbitrumOnePyusd(tokenAddress) || isTokenEthereumPyusd(tokenAddress);
}

export function getPyusdTokenForTransfer({
  tokenAddress,
  isDepositMode,
  pyusdL2Address,
  priceUSD,
  listIds,
}: PyusdTokenMetadata & {
  tokenAddress: string | undefined;
  isDepositMode: boolean;
  pyusdL2Address?: string;
}): ERC20BridgeToken | null {
  if (!tokenAddress) {
    return null;
  }

  if (isDepositMode && isTokenEthereumPyusd(tokenAddress)) {
    return {
      ...getEthereumPyusdToken({
        priceUSD,
        listIds,
      }),
      l2Address: pyusdL2Address ?? CommonAddress.ArbitrumOne.PYUSD,
    };
  }

  if (!isDepositMode && isTokenArbitrumOnePyusdCanonical(tokenAddress)) {
    return getArbitrumOnePyusdCanonicalToken({
      priceUSD,
      listIds,
    });
  }

  // In withdrawal mode, the legacy L1 PYUSD address is treated as the ArbOne PYUSD alias.
  // The canonical path only applies when the explicit Arbitrum One canonical address is selected.
  if (
    !isDepositMode &&
    (isTokenArbitrumOnePyusd(tokenAddress) || isTokenEthereumPyusd(tokenAddress))
  ) {
    return getArbitrumOnePyusdToken({
      priceUSD,
      listIds,
    });
  }

  return null;
}

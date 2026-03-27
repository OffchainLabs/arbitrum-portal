import { ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';
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
    address: CommonAddress.ArbitrumOne.PYUSDCanonical,
    l2Address: CommonAddress.ArbitrumOne.PYUSDCanonical,
    logoURI: ARBITRUM_ONE_PYUSD_OFT_LOGO_URI,
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
    logoURI: ETHEREUM_PYUSD_LOGO_URI,
    priceUSD,
    sourceBalanceAddress: CommonAddress.ArbitrumOne.PYUSDOFT,
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
      destination: getArbitrumOnePyusdOftToken(),
    };
  }

  if (!isDepositMode && isTokenArbitrumOnePyusdOft(tokenAddress)) {
    return {
      source: getArbitrumOnePyusdOftToken(),
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

  return isTokenArbitrumOnePyusdOft(tokenAddress);
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
      l2Address: pyusdL2Address ?? CommonAddress.ArbitrumOne.PYUSDOFT,
    };
  }

  if (isTokenArbitrumOnePyusdCanonical(tokenAddress)) {
    return getArbitrumOnePyusdCanonicalToken({
      priceUSD,
      listIds,
    });
  }

  // In withdrawal mode, the legacy L1 PYUSD address is treated as the OFT alias.
  // The canonical path only applies when the explicit Arbitrum One canonical address is selected.
  if (isTokenArbitrumOnePyusdOft(tokenAddress) || isTokenEthereumPyusd(tokenAddress)) {
    return getArbitrumOnePyusdOftToken({
      priceUSD,
      listIds,
    });
  }

  return null;
}

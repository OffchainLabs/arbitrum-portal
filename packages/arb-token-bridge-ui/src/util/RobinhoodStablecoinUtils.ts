import { ChainId } from '../types/ChainId';
import { addressesEqual } from './AddressUtils';
import { CommonAddress } from './CommonAddressUtils';

/**
 * USDG is the native stablecoin of Robinhood Chain. Almost nobody arrives holding it, so when a
 * user bridges a stablecoin into Robinhood Chain we suggest USDG and let LiFi quote the bridge +
 * swap in one route. The user keeps the final say: nothing switches the destination for them.
 *
 * USDG has two representations in the LiFi token lists, depending on the source chain:
 * - from Ethereum it is a paired token whose `address` is the Ethereum USDG contract
 * - from every other chain it is a LiFi-only token whose `address` is the Robinhood contract
 * Every helper here accepts both.
 */

/** Literal accepted in the `destinationToken` query param as a shorthand for USDG. */
export const USDG_QUERY_PARAM_ALIAS = 'usdg';

const usdgAddresses: readonly string[] = [
  CommonAddress.Ethereum.USDG,
  CommonAddress.RobinhoodChain.USDG,
];

/**
 * Explicit allowlist. Symbols are not used on purpose: LiFi lists a second "USDG" on Robinhood,
 * plus yield wrappers (spUSDG, syrupUSDG) that must not be treated as stablecoins.
 */
const stablecoinAddresses: readonly string[] = [
  CommonAddress.Ethereum.USDC,
  CommonAddress.Ethereum.USDT,
  CommonAddress.Ethereum.DAI,
  CommonAddress.Ethereum.USDS,
  CommonAddress.Ethereum.PYUSD,
  CommonAddress.ArbitrumOne.USDC,
  CommonAddress.ArbitrumOne['USDC.e'],
  CommonAddress.ArbitrumOne.USDT,
  CommonAddress.ArbitrumOne.DAI,
  CommonAddress.ArbitrumOne.USDS,
  CommonAddress.ArbitrumOne.AUSD,
  CommonAddress.ArbitrumOne.PYUSD,
  CommonAddress.Base.USDC,
  CommonAddress.Base.USDT,
  CommonAddress.Base.DAI,
  CommonAddress.Base.USDS,
  CommonAddress.Base.AUSD,
  CommonAddress.ApeChain.USDT,
  CommonAddress.ApeChain.USDCe,
  CommonAddress.Ethereum.USDe,
  CommonAddress.Ethereum.sUSDe,
  CommonAddress.ArbitrumOne.USDe,
  CommonAddress.ArbitrumOne.sUSDe,
  CommonAddress.Base.USDe,
  CommonAddress.Base.sUSDe,
  CommonAddress.RobinhoodChain.USDe,
  CommonAddress.RobinhoodChain.sUSDe,
];

function includesAddress(addresses: readonly string[], address: string | undefined): boolean {
  return addresses.some((candidate) => addressesEqual(candidate, address));
}

export function isTokenUSDG(address: string | undefined): boolean {
  return includesAddress(usdgAddresses, address);
}

export function isStablecoin(address: string | undefined): boolean {
  return includesAddress(stablecoinAddresses, address);
}

export function isUsdgQueryParamAlias(value: string | null | undefined): boolean {
  return value?.toLowerCase() === USDG_QUERY_PARAM_ALIAS;
}

/**
 * The `destinationToken` query param stores the parent-chain address. From Ethereum that is the
 * Ethereum USDG contract; from every other chain USDG is LiFi-only and uses its Robinhood address.
 */
export function getUsdgDestinationTokenAddress(sourceChainId: number): string {
  return sourceChainId === ChainId.Ethereum
    ? CommonAddress.Ethereum.USDG
    : CommonAddress.RobinhoodChain.USDG;
}

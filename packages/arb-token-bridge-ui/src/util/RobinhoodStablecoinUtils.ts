import { ChainId } from '../types/ChainId';
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

const usdgAddresses: ReadonlySet<string> = new Set(
  [CommonAddress.Ethereum.USDG, CommonAddress.RobinhoodChain.USDG].map((address) =>
    address.trim().toLowerCase(),
  ),
);

/**
 * Explicit allowlist. Symbols are not used on purpose: LiFi lists a second "USDG" on Robinhood,
 * plus yield wrappers (spUSDG, syrupUSDG, sUSDe) that must not be treated as stablecoins.
 * USDe is left out too: it has its own canonical route into Robinhood Chain, so the USDG
 * suggestion must not show for it.
 */
const stablecoinAddresses: ReadonlySet<string> = new Set(
  [
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
  ].map((address) => address.trim().toLowerCase()),
);

export function isTokenUSDG(address: string | undefined): boolean {
  return address !== undefined && usdgAddresses.has(address.trim().toLowerCase());
}

export function isStablecoin(address: string | undefined): boolean {
  return address !== undefined && stablecoinAddresses.has(address.trim().toLowerCase());
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

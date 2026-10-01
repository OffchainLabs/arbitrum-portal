import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';

/**
 * USDG is the native stablecoin of Robinhood Chain. Almost nobody arrives holding it, so when a
 * user picks another stablecoin as the destination on Robinhood Chain we suggest USDG and let LiFi
 * quote the bridge + swap in one route. The user keeps the final say: nothing switches the
 * destination for them.
 *
 * USDG is also the official stablecoin of Arbitrum One, where it is issued natively (not bridged
 * from Ethereum), so it pairs with the other chains through LiFi.
 *
 * USDG has three representations in the LiFi token lists, depending on the source chain:
 * - from Ethereum it is a paired token whose `address` is the Ethereum USDG contract
 * - from Arbitrum One it is a paired token whose `address` is the Arbitrum One contract
 * - from every other chain it is a LiFi-only token whose `address` is the Robinhood contract
 * Every helper here accepts all of them.
 */

function toAddressSet(addresses: readonly string[]): ReadonlySet<string> {
  return new Set(addresses.map((address) => address.trim().toLowerCase()));
}

/** Literal accepted in the `destinationToken` query param as a shorthand for USDG. */
export const USDG_QUERY_PARAM_ALIAS = 'usdg';

const usdgAddresses = toAddressSet([
  CommonAddress.Ethereum.USDG,
  CommonAddress.ArbitrumOne.USDG,
  CommonAddress.RobinhoodChain.USDG,
]);

/**
 * Chains where USDG is the official stablecoin. Their USDG row carries the native stablecoin badge
 * and is pinned right under ETH in the destination picker.
 */
const usdgNativeStablecoinChainIds = new Set<number>([ChainId.RobinhoodChain, ChainId.ArbitrumOne]);

/**
 * Explicit allowlist, keyed by chain so an address only counts on the chain it lives on. Symbols
 * are not used on purpose: LiFi lists a second "USDG" on Robinhood, plus yield wrappers (spUSDG,
 * syrupUSDG, sUSDe) that must not be treated as stablecoins.
 * USDe is left out too: it has its own canonical route into Robinhood Chain, so the USDG
 * suggestion must not show for it.
 */
const stablecoinAddressesByChain: Partial<Record<number, ReadonlySet<string>>> = {
  [ChainId.Ethereum]: toAddressSet([
    CommonAddress.Ethereum.USDC,
    CommonAddress.Ethereum.USDT,
    CommonAddress.Ethereum.DAI,
    CommonAddress.Ethereum.USDS,
    CommonAddress.Ethereum.PYUSD,
  ]),
  [ChainId.ArbitrumOne]: toAddressSet([
    CommonAddress.ArbitrumOne.USDC,
    CommonAddress.ArbitrumOne['USDC.e'],
    CommonAddress.ArbitrumOne.USDT,
    CommonAddress.ArbitrumOne.DAI,
    CommonAddress.ArbitrumOne.USDS,
    CommonAddress.ArbitrumOne.AUSD,
    CommonAddress.ArbitrumOne.PYUSD,
  ]),
  [ChainId.Base]: toAddressSet([
    CommonAddress.Base.USDC,
    CommonAddress.Base.USDT,
    CommonAddress.Base.DAI,
    CommonAddress.Base.USDS,
    CommonAddress.Base.AUSD,
  ]),
  [ChainId.ApeChain]: toAddressSet([CommonAddress.ApeChain.USDT, CommonAddress.ApeChain.USDCe]),
};

export function isTokenUSDG(address: string | undefined): boolean {
  return address !== undefined && usdgAddresses.has(address.trim().toLowerCase());
}

export function isUsdgNativeStablecoinChain(chainId: number): boolean {
  return usdgNativeStablecoinChainIds.has(chainId);
}

/** `chainId` is the chain the address lives on, not the chain being bridged to. */
export function isStablecoin(address: string | undefined, chainId: number): boolean {
  return (
    address !== undefined &&
    (stablecoinAddressesByChain[chainId]?.has(address.trim().toLowerCase()) ?? false)
  );
}

export function isUsdgQueryParamAlias(value: string | null | undefined): boolean {
  return value?.toLowerCase() === USDG_QUERY_PARAM_ALIAS;
}

/**
 * The `destinationToken` query param stores the parent-chain address. From Ethereum and Arbitrum
 * One that is their own USDG contract (both pair with Robinhood USDG); from every other chain USDG
 * is LiFi-only and uses its Robinhood address.
 */
export function getUsdgDestinationTokenAddress(sourceChainId: number): string {
  switch (sourceChainId) {
    case ChainId.Ethereum:
      return CommonAddress.Ethereum.USDG;
    case ChainId.ArbitrumOne:
      return CommonAddress.ArbitrumOne.USDG;
    default:
      return CommonAddress.RobinhoodChain.USDG;
  }
}

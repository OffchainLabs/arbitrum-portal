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
 * USDG has three representations in the LiFi token lists, depending on the chain pair:
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

/** Chains where USDG is the official stablecoin. Their USDG row carries the native stablecoin badge. */
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

/**
 * USDG is surfaced the way ETH is, listed in both token panels whether or not the wallet holds it
 * and pinned right under ETH, on every route into a chain where it is the official stablecoin and
 * on every route out of Arbitrum One.
 */
export function isUsdgSurfacedLikeEth({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}): boolean {
  return isUsdgNativeStablecoinChain(destinationChainId) || sourceChainId === ChainId.ArbitrumOne;
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
 * Lookup key of the USDG pair by destination chain, then source chain. It is the parent-chain
 * address of the pair (what the `destinationToken` query param stores), or the Robinhood
 * contract where USDG is LiFi-only. A missing entry means the route has no USDG pair.
 */
const usdgPairLookupKeys: Partial<Record<number, Partial<Record<number, string>>>> = {
  [ChainId.RobinhoodChain]: {
    [ChainId.Ethereum]: CommonAddress.Ethereum.USDG,
    [ChainId.ArbitrumOne]: CommonAddress.ArbitrumOne.USDG,
    [ChainId.Base]: CommonAddress.RobinhoodChain.USDG,
    [ChainId.ApeChain]: CommonAddress.RobinhoodChain.USDG,
  },
  [ChainId.ArbitrumOne]: {
    [ChainId.Ethereum]: CommonAddress.Ethereum.USDG,
    // Arbitrum One is the parent on this pair
    [ChainId.RobinhoodChain]: CommonAddress.ArbitrumOne.USDG,
  },
};

export function getUsdgDestinationTokenAddress({
  sourceChainId,
  destinationChainId,
}: {
  sourceChainId: number;
  destinationChainId: number;
}): string | undefined {
  return usdgPairLookupKeys[destinationChainId]?.[sourceChainId];
}

import { ChainId } from '../../../types/ChainId';
import { addressesEqual } from '../../../util/AddressEquality';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { ecosystems, getLifiOnlyChains } from '../../../wallet/ecosystems';
import type { WalletEcosystem } from '../../../wallet/types';

type NonEvmEcosystem = Exclude<WalletEcosystem, 'evm'>;

/** LiFi settings of one chain, whether or not it also has a canonical bridge */
export type LifiChainConfig = {
  /** Chains it sends to through LiFi */
  destinationChainIds?: readonly number[];
  /**
   * Chains that send to it through LiFi. They are added to those chains' destinations, so a new
   * chain declares its routes in both directions in its own entry
   */
  sourceChainIds?: readonly number[];
  /**
   * It allows all "unmatched" tokens, which exist on that chain but not on the other one, so LiFi
   * swaps can send or receive them. For example stock tokens on Robinhood Chain. Required, so each
   * chain states it
   */
  allowsUnmatchedTokens: boolean;
  /** Unmatched tokens allowed one by one, on a chain that doesn't allow all of them */
  unmatchedTokenAddresses?: readonly string[];
};

const evmLifiChains: Record<number, LifiChainConfig> = {
  [ChainId.Ethereum]: {
    destinationChainIds: [
      ChainId.ArbitrumOne,
      ChainId.ArbitrumNova,
      ChainId.ApeChain,
      ChainId.RobinhoodChain,
    ],
    allowsUnmatchedTokens: false,
  },
  [ChainId.ArbitrumOne]: {
    destinationChainIds: [ChainId.Ethereum, ChainId.ApeChain, ChainId.RobinhoodChain],
    allowsUnmatchedTokens: false,
  },
  [ChainId.ArbitrumNova]: {
    destinationChainIds: [ChainId.Ethereum, ChainId.ArbitrumOne],
    allowsUnmatchedTokens: false,
  },
  [ChainId.ApeChain]: {
    destinationChainIds: [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.RobinhoodChain],
    allowsUnmatchedTokens: false,
  },
  [ChainId.Base]: {
    destinationChainIds: [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.RobinhoodChain],
    allowsUnmatchedTokens: false,
    // Base USDC can fund swaps even though Base has no bridged counterpart entry
    unmatchedTokenAddresses: [CommonAddress.Base.USDC],
  },
  [ChainId.RobinhoodChain]: {
    destinationChainIds: [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.ApeChain],
    allowsUnmatchedTokens: true,
  },
  // LiFi has no route between Elysium and Arbitrum Nova
  [ChainId.Elysium]: {
    destinationChainIds: [
      ChainId.Ethereum,
      ChainId.ArbitrumOne,
      ChainId.ApeChain,
      ChainId.RobinhoodChain,
    ],
    sourceChainIds: [
      ChainId.Ethereum,
      ChainId.ArbitrumOne,
      ChainId.ApeChain,
      ChainId.Base,
      ChainId.RobinhoodChain,
      ChainId.Solana,
    ],
    // Most Elysium tokens, such as kHYPE and KNTQ, have no counterpart on other chains
    allowsUnmatchedTokens: true,
  },
};

// Keyed by ecosystem, so a new ecosystem fails to compile until it declares its LiFi chains
const nonEvmLifiChains: Record<NonEvmEcosystem, Record<number, LifiChainConfig>> = {
  solana: {
    [ChainId.Solana]: {
      destinationChainIds: [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.RobinhoodChain],
      allowsUnmatchedTokens: true,
    },
  },
};

const lifiChains: Record<number, LifiChainConfig> = Object.assign(
  {},
  evmLifiChains,
  ...Object.values(nonEvmLifiChains),
);

// Chains of a disabled ecosystem, such as Solana while its flag is off, and LiFi-only chains whose
// flag is off, such as Elysium, have no LiFi routes
const enabledLifiOnlyChainIds = new Set(getLifiOnlyChains().map((chain) => chain.id));
const disabledChainIds = new Set([
  ...Object.values(ecosystems)
    .filter((ecosystem) => !ecosystem.isEnabled())
    .flatMap((ecosystem) => ecosystem.chains.map((chain) => chain.id)),
  ...getLifiOnlyChains({ includeDisabled: true })
    .map((chain) => chain.id)
    .filter((chainId) => !enabledLifiOnlyChainIds.has(chainId)),
]);

/** Merges each chain's destinations and sources into one list of destinations per source chain */
export function buildLifiDestinationChainIds(
  chains: Record<number, Pick<LifiChainConfig, 'destinationChainIds' | 'sourceChainIds'>>,
  disabled: ReadonlySet<number>,
): Record<number, number[]> {
  const routes: Record<number, number[]> = {};
  const addRoute = (sourceChainId: number, destinationChainId: number) => {
    if (disabled.has(sourceChainId) || disabled.has(destinationChainId)) {
      return;
    }
    const destinationChainIds = (routes[sourceChainId] ??= []);
    if (!destinationChainIds.includes(destinationChainId)) {
      destinationChainIds.push(destinationChainId);
    }
  };

  // A chain's own destinations come first, so a new chain's routes don't reorder its sources' lists
  for (const [chainId, config] of Object.entries(chains)) {
    config.destinationChainIds?.forEach((destinationChainId) =>
      addRoute(Number(chainId), destinationChainId),
    );
  }
  for (const [chainId, config] of Object.entries(chains)) {
    config.sourceChainIds?.forEach((sourceChainId) => addRoute(sourceChainId, Number(chainId)));
  }
  return routes;
}

export const lifiDestinationChainIds: Record<number, number[]> = buildLifiDestinationChainIds(
  lifiChains,
  disabledChainIds,
);

export const allowedLifiSourceChainIds: number[] = Object.keys(lifiDestinationChainIds).map((id) =>
  Number(id),
);
export const allowedLifiDestinationChainIds: number[] = Object.values(
  lifiDestinationChainIds,
).flatMap((id) => id);

export function allowsUnmatchedLifiTokens(chainId: number): boolean {
  return lifiChains[chainId]?.allowsUnmatchedTokens ?? false;
}

/** Whether a chain allows any unmatched tokens, including individually allowlisted addresses. */
export function hasUnmatchedLifiTokens(chainId: number): boolean {
  return (
    allowsUnmatchedLifiTokens(chainId) ||
    (lifiChains[chainId]?.unmatchedTokenAddresses?.length ?? 0) > 0
  );
}

/**
 * Superset of {@link allowsUnmatchedLifiTokens}: returns true for every address on a chain that
 * allows all unmatched tokens, and additionally for its `unmatchedTokenAddresses`.
 */
export function isUnmatchedLifiTokenAllowed(chainId: number, address: string): boolean {
  return (
    allowsUnmatchedLifiTokens(chainId) ||
    (lifiChains[chainId]?.unmatchedTokenAddresses?.some((allowedAddress) =>
      addressesEqual(allowedAddress, address),
    ) ??
      false)
  );
}

import { ChainId } from '../../../types/ChainId';
import { addressesEqual } from '../../../util/AddressEquality';
import { CommonAddress } from '../../../util/CommonAddressUtils';
import { isSolanaEnabled } from '../../../util/featureFlag';

const sourceOnlyLifiDestinationChainIds: Record<number, number[]> = isSolanaEnabled()
  ? { [ChainId.Solana]: [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition] }
  : {};

export const lifiDestinationChainIds: Record<number, number[]> = {
  ...sourceOnlyLifiDestinationChainIds,
  [ChainId.Ethereum]: [
    ChainId.ArbitrumOne,
    ChainId.ArbitrumNova,
    ChainId.ApeChain,
    ChainId.RobinhoodChain,
  ],
  [ChainId.ArbitrumOne]: [ChainId.Ethereum, ChainId.ApeChain, ChainId.RobinhoodChain],
  [ChainId.ArbitrumNova]: [ChainId.Ethereum, ChainId.ArbitrumOne],
  [ChainId.ApeChain]: [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.RobinhoodChain],
  [ChainId.Base]: [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.RobinhoodChain],
  [ChainId.RobinhoodChain]: [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.ApeChain],
};

export const allowedLifiSourceChainIds: number[] = Object.keys(lifiDestinationChainIds).map((id) =>
  Number(id),
);
export const allowedLifiDestinationChainIds: number[] = Object.values(
  lifiDestinationChainIds,
).flatMap((id) => id);

export const lifiSourceOnlyChainIds = new Set<number>(
  Object.keys(sourceOnlyLifiDestinationChainIds).map(Number),
);

/**
 * All LiFi chains allowed to have "unmatched" tokens.
 * Some tokens only exist on one chain (for example stock tokens on Robinhood),
 * we want to allow them to be source or destination of swaps through LiFi
 */
const UNMATCHED_LIFI_TOKEN_CHAIN_IDS = new Set<number>([
  ChainId.RobinhoodChain,
  ...lifiSourceOnlyChainIds,
]);

/**
 * Individual tokens allowed to be "unmatched" on chains that don't allow all of them.
 * Base USDC can fund swaps even though Base has no bridged counterpart entry.
 */
const UNMATCHED_LIFI_TOKEN_ADDRESSES: Partial<Record<number, readonly string[]>> = {
  [ChainId.Base]: [CommonAddress.Base.USDC],
};

export function allowsUnmatchedLifiTokens(chainId: number): boolean {
  return UNMATCHED_LIFI_TOKEN_CHAIN_IDS.has(chainId);
}

/** Whether a chain allows any unmatched tokens, including individually allowlisted addresses. */
export function hasUnmatchedLifiTokens(chainId: number): boolean {
  return (
    allowsUnmatchedLifiTokens(chainId) || (UNMATCHED_LIFI_TOKEN_ADDRESSES[chainId]?.length ?? 0) > 0
  );
}

/**
 * Superset of {@link allowsUnmatchedLifiTokens}: returns true for every address on a chain that
 * allows all unmatched tokens, and additionally for the individually allowlisted addresses above.
 */
export function isUnmatchedLifiTokenAllowed(chainId: number, address: string): boolean {
  return (
    allowsUnmatchedLifiTokens(chainId) ||
    (UNMATCHED_LIFI_TOKEN_ADDRESSES[chainId]?.some((allowedAddress) =>
      addressesEqual(allowedAddress, address),
    ) ??
      false)
  );
}

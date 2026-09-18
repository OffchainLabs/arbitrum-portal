import { additionalLifiDestinationChainIds } from '@bridge-networks';

import { ChainId } from '../../../types/ChainId';

export const lifiDestinationChainIds: Record<number, number[]> = {
  ...additionalLifiDestinationChainIds,
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

/**
 * All LiFi chains allowed to have "unmatched" tokens.
 * Some tokens only exist on one chain (for example stock tokens on Robinhood),
 * we want to allow them to be source or destination of swaps through LiFi
 */
const UNMATCHED_LIFI_TOKEN_CHAIN_IDS = new Set<number>([
  ChainId.RobinhoodChain,
  ...Object.keys(additionalLifiDestinationChainIds).map(Number),
]);

export function allowsUnmatchedLifiTokens(chainId: number): boolean {
  return UNMATCHED_LIFI_TOKEN_CHAIN_IDS.has(chainId);
}

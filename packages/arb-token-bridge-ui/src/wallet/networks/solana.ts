import { ChainId } from '../../types/ChainId';

export const additionalLifiDestinationChainIds: Record<number, number[]> = {
  [ChainId.Solana]: [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition],
};

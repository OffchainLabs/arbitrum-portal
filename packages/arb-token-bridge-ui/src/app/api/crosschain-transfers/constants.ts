import { ChainId } from '../../../types/ChainId';

export const lifiDestinationChainIds: Record<number, number[]> = {
  [ChainId.Ethereum]: [
    ChainId.ArbitrumOne,
    ChainId.ArbitrumNova,
    ChainId.ApeChain,
    ChainId.Superposition,
    ChainId.RobinhoodChain,
  ],
  [ChainId.ArbitrumOne]: [
    ChainId.Ethereum,
    ChainId.ApeChain,
    ChainId.Superposition,
    ChainId.RobinhoodChain,
  ],
  [ChainId.ArbitrumNova]: [ChainId.Ethereum, ChainId.ArbitrumOne],
  [ChainId.ApeChain]: [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.Superposition],
  [ChainId.Superposition]: [
    ChainId.Ethereum,
    ChainId.ArbitrumOne,
    ChainId.ApeChain,
    ChainId.RobinhoodChain,
  ],
  [ChainId.Base]: [
    ChainId.ArbitrumOne,
    ChainId.ApeChain,
    ChainId.Superposition,
    ChainId.RobinhoodChain,
  ],
  [ChainId.RobinhoodChain]: [ChainId.Ethereum, ChainId.ArbitrumOne, ChainId.Superposition],
};

export const allowedLifiSourceChainIds: number[] = Object.keys(lifiDestinationChainIds).map((id) =>
  Number(id),
);
export const allowedLifiDestinationChainIds: number[] = Object.values(
  lifiDestinationChainIds,
).flatMap((id) => id);
